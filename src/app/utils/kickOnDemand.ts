import {
  type GlobalData,
  type KickOnDemandEntry,
  type RemoteKickLivestream,
} from "../../types";
import {
  parseLivestreamResponse,
  parseVodIdFromInfo,
  type KickPollResult,
} from "./kickLive";
import { getKickRequestQueue } from "./kickRequestQueue";
import { log } from "./log";

export const KICK_ON_DEMAND_TTL_MS = 2 * 60 * 1000;

const KICK_CHANNEL_SLUG = /^[A-Za-z0-9_-]{2,25}$/;
const REQUEST_TIMEOUT_MS = 10_000;
const KICK_USER_AGENT = "Mozilla/5.0";

export interface KickChannelView {
  live: boolean;
  vodId: string | null;
  createdAt: string | null;
  playbackUrl: string | null;
}

export type KickChannelDecision =
  | { kind: "reject" }
  | { kind: "cached"; stream: RemoteKickLivestream | null }
  | { kind: "fetch" };

export const isKickChannelSlug = (slug: string): boolean =>
  KICK_CHANNEL_SLUG.test(slug);

const offlineView = (): KickChannelView => ({
  live: false,
  vodId: null,
  createdAt: null,
  playbackUrl: null,
});

// createdAt is the livestream endpoint's created_at, which is ISO UTC.
export const toKickChannelView = (
  stream: RemoteKickLivestream | null | undefined,
): KickChannelView => {
  if (!stream?.playback_url) return offlineView();
  return {
    live: true,
    vodId: stream.vodId ? stream.vodId : null,
    createdAt: stream.created_at,
    playbackUrl: stream.playback_url,
  };
};

const findNpStream = (
  streams: readonly RemoteKickLivestream[] | undefined,
  slug: string,
): RemoteKickLivestream | undefined => {
  const key = slug.toLowerCase();
  return streams?.find((stream) => stream.channelName.toLowerCase() === key);
};

// NoPixel cache wins. A fresh on-demand row is reused. Anything else, including
// an invalid slug, does not get a new Kick request from this decision.
export const decideKickChannel = (
  slug: string,
  npStreams: readonly RemoteKickLivestream[] | undefined,
  onDemand: Readonly<Record<string, KickOnDemandEntry>> | undefined,
  now: number,
): KickChannelDecision => {
  if (!isKickChannelSlug(slug)) return { kind: "reject" };
  const np = findNpStream(npStreams, slug);
  if (np) return { kind: "cached", stream: np };
  const existing = onDemand?.[slug.toLowerCase()];
  if (existing && now - existing.fetchedAt < KICK_ON_DEMAND_TTL_MS) {
    return { kind: "cached", stream: existing.stream };
  }
  return { kind: "fetch" };
};

export interface KickOnDemandDeps {
  now?: () => number;
  store: {
    read: () => Record<string, KickOnDemandEntry> | undefined;
    write: (next: Record<string, KickOnDemandEntry>) => void;
  };
  inflight: Map<string, Promise<KickOnDemandEntry>>;
  fetchLivestream: (slug: string) => Promise<KickPollResult>;
  fetchVodId?: (slug: string, livestreamId: number) => Promise<string | null>;
}

// One Kick livestream fetch per slug per two minutes. Concurrent callers share
// the in-flight promise. A failure still records fetchedAt so it is not retried
// inside that window. The NoPixel list is never written here.
export const loadKickOnDemand = (
  slug: string,
  deps: KickOnDemandDeps,
): Promise<KickOnDemandEntry | null> => {
  if (!isKickChannelSlug(slug)) return Promise.resolve(null);
  const key = slug.toLowerCase();
  const now = () => deps.now?.() ?? Date.now();
  const current = deps.store.read()?.[key];
  if (current && now() - current.fetchedAt < KICK_ON_DEMAND_TTL_MS) {
    return Promise.resolve(current);
  }
  const pending = deps.inflight.get(key);
  if (pending) return pending;

  let resolveJob!: (entry: KickOnDemandEntry) => void;
  const job = new Promise<KickOnDemandEntry>((resolve) => {
    resolveJob = resolve;
  });
  deps.inflight.set(key, job);

  void (async () => {
    const previous = current?.stream ?? null;
    let stream = previous;
    try {
      const result = await deps.fetchLivestream(slug);
      if (result.ok) {
        stream = result.stream;
        if (stream && !stream.vodId && deps.fetchVodId) {
          const vodId = await deps
            .fetchVodId(slug, stream.id)
            .catch(() => null);
          if (vodId) stream = { ...stream, vodId };
        }
      }
    } catch (error) {
      log(
        `[kickOnDemand] ${slug} failed:`,
        error instanceof Error ? error.message : error,
      );
      stream = previous;
    }
    const entry: KickOnDemandEntry = { stream, fetchedAt: now() };
    const latest = deps.store.read() ?? {};
    deps.store.write({ ...latest, [key]: entry });
    resolveJob(entry);
    if (deps.inflight.get(key) === job) deps.inflight.delete(key);
  })();

  return job;
};

const globalData = global as GlobalData;

const kickFetch = (url: string): Promise<Response> =>
  fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": KICK_USER_AGENT,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

const queuedGet = async (
  url: string,
): Promise<{ status: number; raw: string }> => {
  const queue = getKickRequestQueue();
  log(`[kickOnDemand] ${url}`);
  return queue.enqueue(
    async () => {
      const response = await kickFetch(url);
      queue.noteResponse(response.status, response.headers.get("retry-after"));
      const raw = await response.text();
      return { status: response.status, raw };
    },
    { front: true },
  );
};

const fetchLivestreamFromKick = async (
  slug: string,
): Promise<KickPollResult> => {
  const url = `https://kick.com/api/v2/channels/${encodeURIComponent(slug)}/livestream`;
  const { status, raw } = await queuedGet(url);
  return parseLivestreamResponse(slug, status, raw);
};

const fetchVodIdFromKick = async (
  slug: string,
  livestreamId: number,
): Promise<string | null> => {
  const url = `https://kick.com/api/v2/channels/${encodeURIComponent(slug)}/info`;
  const { status, raw } = await queuedGet(url);
  return parseVodIdFromInfo(status, raw, livestreamId);
};

export const ensureKickOnDemand = (
  slug: string,
): Promise<KickOnDemandEntry | null> => {
  globalData.kickOnDemandInflight ??= new Map();
  return loadKickOnDemand(slug, {
    store: {
      read: () => globalData.kickOnDemand,
      write: (next) => {
        globalData.kickOnDemand = next;
      },
    },
    inflight: globalData.kickOnDemandInflight,
    fetchLivestream: fetchLivestreamFromKick,
    fetchVodId: fetchVodIdFromKick,
  });
};

export const kickChannelView = async (
  slug: string,
  npStreams: readonly RemoteKickLivestream[] | undefined,
): Promise<KickChannelView> => {
  const decision = decideKickChannel(
    slug,
    npStreams,
    globalData.kickOnDemand,
    Date.now(),
  );
  if (decision.kind === "reject") return offlineView();
  if (decision.kind === "cached") return toKickChannelView(decision.stream);
  const entry = await ensureKickOnDemand(slug);
  return toKickChannelView(entry?.stream ?? null);
};
