import {
  parseKickSevenTvSetId,
  parseKickUserId,
  parseSevenTvEmoteSet,
  type EmoteMap,
} from "./kickEmotes";

const GLOBAL_URL = "https://7tv.io/v3/emote-sets/global";
const GQL_URL = "https://7tv.io/v3/gql";
const REQUEST_TIMEOUT_MS = 25_000;
const KICK_TIMEOUT_MS = 10_000;

// GET /v3/users/kick/<user id> answers, but the body is the full emote set
// with nested owners (multiple megabytes). The v3 GraphQL queries return the
// Kick connection's set id, then that set's emote names, which is what chat
// needs. The global set is small enough on the REST route.
const USER_QUERY = `query KickUser($id: String!) {
  userByConnection(platform: KICK, id: $id) {
    connections { platform id emote_set_id }
  }
}`;

const SET_QUERY = `query EmoteSet($id: ObjectID!) {
  emoteSet(id: $id) {
    emotes { id name }
  }
}`;

export const EMOTE_REFRESH_MS = 30 * 60 * 1000;

export interface EmoteCatalogOptions {
  userIdFor: (slug: string) => Promise<number | null>;
  fetchGlobal?: () => Promise<unknown>;
  fetchChannelSet?: (userId: number) => Promise<unknown>;
  refreshMs?: number;
  now?: () => number;
}

interface ChannelCache {
  userId: number;
  emotes: EmoteMap;
  fetchedAt: number;
  ok: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isUnknownArray = (value: unknown): value is readonly unknown[] =>
  Array.isArray(value);

const fetchJson = async (
  url: string,
  timeoutMs: number,
  init?: { method?: string; body?: string; headers?: Record<string, string> },
): Promise<unknown> => {
  const response = await fetch(url, {
    method: init?.method,
    body: init?.body,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`request failed (${String(response.status)})`);
  }
  return (await response.json()) as unknown;
};

export const fetchSevenTvGlobal = (): Promise<unknown> =>
  fetchJson(GLOBAL_URL, REQUEST_TIMEOUT_MS);

const isFailedQuery = (body: unknown): boolean =>
  isRecord(body) && body.data == null && isUnknownArray(body.errors);

const queryError = (body: unknown): string => {
  if (!isRecord(body) || !isUnknownArray(body.errors))
    return "7TV query failed";
  const first = body.errors[0];
  if (
    isRecord(first) &&
    typeof first.message === "string" &&
    first.message.length > 0
  ) {
    return first.message;
  }
  return "7TV query failed";
};

export const fetchSevenTvChannelSet = async (
  userId: number,
): Promise<unknown> => {
  const user = await fetchJson(GQL_URL, REQUEST_TIMEOUT_MS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: USER_QUERY,
      variables: { id: String(userId) },
    }),
  });
  if (isFailedQuery(user)) throw new Error(queryError(user));
  const setId = parseKickSevenTvSetId(user, userId);
  if (setId === null) return { emotes: [] };
  const set = await fetchJson(GQL_URL, REQUEST_TIMEOUT_MS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: SET_QUERY, variables: { id: setId } }),
  });
  if (isFailedQuery(set)) throw new Error(queryError(set));
  return set;
};

export const fetchKickUserId = async (slug: string): Promise<number | null> => {
  const url = `https://kick.com/api/v2/channels/${encodeURIComponent(slug)}`;
  const body = await fetchJson(url, KICK_TIMEOUT_MS);
  return parseKickUserId(body);
};

/** Remembers a Kick user id for the page session. A failed lookup is not cached. */
export const createKickUserIdLookup = (): ((
  slug: string,
) => Promise<number | null>) => {
  const cache = new Map<string, number>();
  return async (slug) => {
    const key = slug.toLowerCase();
    const saved = cache.get(key);
    if (saved !== undefined) return saved;
    const id = await fetchKickUserId(slug);
    if (id !== null) cache.set(key, id);
    return id;
  };
};

const sameMap = (left: EmoteMap, right: EmoteMap): boolean => {
  if (left.size !== right.size) return false;
  for (const [name, url] of left) {
    if (right.get(name) !== url) return false;
  }
  return true;
};

export class EmoteCatalog {
  private readonly userIdFor: (slug: string) => Promise<number | null>;
  private readonly fetchGlobal: () => Promise<unknown>;
  private readonly fetchChannelSet: (userId: number) => Promise<unknown>;
  private readonly refreshMs: number;
  private readonly now: () => number;
  private readonly watched = new Set<string>();
  private readonly channels = new Map<string, ChannelCache>();
  private readonly channelFlight = new Map<string, Promise<void>>();
  private readonly published = new Map<string, EmoteMap>();
  private readonly listeners = new Map<
    string,
    Set<(emotes: EmoteMap) => void>
  >();
  private readonly channelErrors = new Set<string>();
  private globalEmotes: EmoteMap = new Map();
  private globalFetchedAt: number | null = null;
  private globalFlight: Promise<void> | null = null;
  private globalOk = false;
  private globalFailed = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(options: EmoteCatalogOptions) {
    this.userIdFor = options.userIdFor;
    this.fetchGlobal = options.fetchGlobal ?? fetchSevenTvGlobal;
    this.fetchChannelSet = options.fetchChannelSet ?? fetchSevenTvChannelSet;
    this.refreshMs = options.refreshMs ?? EMOTE_REFRESH_MS;
    this.now = options.now ?? Date.now;
  }

  start(): void {
    if (this.timer !== null) return;
    const timer = setInterval(() => {
      this.refreshAll();
    }, this.refreshMs);
    this.timer = timer;
    if (typeof timer === "object" && "unref" in timer) timer.unref();
  }

  stop(): void {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  watch(slug: string): Promise<void> {
    const key = this.key(slug);
    this.watched.add(key);
    return this.refreshChannel(key, false);
  }

  /** Stops refreshing this channel. The last set is kept for the next open. */
  unwatch(slug: string): void {
    this.watched.delete(this.key(slug));
  }

  subscribe(slug: string, listener: (emotes: EmoteMap) => void): () => void {
    const key = this.key(slug);
    const bucket =
      this.listeners.get(key) ?? new Set<(emotes: EmoteMap) => void>();
    this.listeners.set(key, bucket);
    bucket.add(listener);
    const current = this.published.get(key);
    if (current) listener(current);
    return () => {
      bucket.delete(listener);
      if (bucket.size === 0) this.listeners.delete(key);
    };
  }

  emotesFor(slug: string): EmoteMap | undefined {
    return this.published.get(this.key(slug));
  }

  private key(slug: string): string {
    return slug.toLowerCase();
  }

  private refreshAll(): void {
    for (const slug of this.watched) void this.refreshChannel(slug, true);
  }

  private refreshChannel(slug: string, force: boolean): Promise<void> {
    const running = this.channelFlight.get(slug);
    if (running) return running;
    const task = this.loadChannel(slug, force).catch((error: unknown) => {
      this.noteChannelFailure(slug, error);
    });
    void task.finally(() => {
      if (this.channelFlight.get(slug) === task)
        this.channelFlight.delete(slug);
    });
    this.channelFlight.set(slug, task);
    return task;
  }

  private async loadChannel(slug: string, force: boolean): Promise<void> {
    await this.ensureGlobal(force);
    if (!this.watched.has(slug)) return;
    const cached = this.channels.get(slug);
    if (
      cached?.ok &&
      !force &&
      this.now() - cached.fetchedAt < this.refreshMs
    ) {
      this.publish(slug);
      return;
    }
    let userId: number | null = null;
    try {
      userId = await this.userIdFor(slug);
    } catch (error) {
      this.noteChannelFailure(slug, error);
      userId = null;
    }
    if (!this.watched.has(slug)) return;
    if (userId === null) {
      this.publish(slug);
      return;
    }
    try {
      const body = await this.fetchChannelSet(userId);
      if (!this.watched.has(slug)) return;
      const emotes = parseSevenTvEmoteSet(body);
      if (!emotes) throw new Error("7TV channel emote set could not be read");
      this.channels.set(slug, {
        userId,
        emotes,
        fetchedAt: this.now(),
        ok: true,
      });
      this.channelErrors.delete(slug);
    } catch (error) {
      this.noteChannelFailure(slug, error);
    }
    if (this.watched.has(slug)) this.publish(slug);
  }

  private ensureGlobal(force: boolean): Promise<void> {
    if (
      !force &&
      this.globalOk &&
      this.globalFetchedAt !== null &&
      this.now() - this.globalFetchedAt < this.refreshMs
    ) {
      return Promise.resolve();
    }
    if (this.globalFlight) return this.globalFlight;
    const task = this.loadGlobal().finally(() => {
      if (this.globalFlight === task) this.globalFlight = null;
    });
    this.globalFlight = task;
    return task;
  }

  private async loadGlobal(): Promise<void> {
    try {
      const body = await this.fetchGlobal();
      const emotes = parseSevenTvEmoteSet(body);
      if (!emotes) throw new Error("7TV global emote set could not be read");
      this.globalEmotes = emotes;
      this.globalOk = true;
      this.globalFetchedAt = this.now();
      this.globalFailed = false;
    } catch (error) {
      this.globalOk = false;
      if (!this.globalFailed) {
        this.globalFailed = true;
        const message =
          error instanceof Error ? error.message : "request failed";
        console.error(
          `[kick-emotes] 7TV global emotes unavailable: ${message}`,
        );
      }
    }
    for (const slug of this.watched) this.publish(slug);
  }

  private publish(slug: string): void {
    if (!this.watched.has(slug)) return;
    const map = this.merged(slug);
    const previous = this.published.get(slug);
    if (previous && sameMap(previous, map)) return;
    this.published.set(slug, map);
    const listeners = this.listeners.get(slug);
    if (!listeners) return;
    for (const listener of [...listeners]) listener(map);
  }

  private merged(slug: string): Map<string, string> {
    const map = new Map(this.globalEmotes);
    const channel = this.channels.get(slug);
    if (!channel) return map;
    for (const [name, url] of channel.emotes) map.set(name, url);
    return map;
  }

  private noteChannelFailure(slug: string, error: unknown): void {
    if (this.channelErrors.has(slug)) return;
    this.channelErrors.add(slug);
    const message = error instanceof Error ? error.message : "request failed";
    console.error(
      `[kick-emotes] 7TV emotes unavailable for ${slug}: ${message}`,
    );
  }
}
