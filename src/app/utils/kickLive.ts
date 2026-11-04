import { type ChatroomsInfo, type RemoteKickLivestream } from "../../types";

export interface KickLiveApiStream {
  channelName: string;
  title: string;
  viewers: number;
  startedAt: string;
  category: string;
  thumbnail: string;
  playbackUrl: string;
  id: number;
  vodId?: string;
}

export interface KickLiveApiResponse {
  savedAt: string;
  streams: KickLiveApiStream[];
}

export interface KickPollFailure {
  channelName: string;
  ok: false;
}

export interface KickPollSuccess {
  channelName: string;
  ok: true;
  stream: RemoteKickLivestream | null;
}

export type KickPollResult = KickPollFailure | KickPollSuccess;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === "string";

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

// Same channels the browser fallback fetches: chatrooms with np set.
export const npKickChannels = (
  chatrooms: Record<string, Pick<ChatroomsInfo, "np">>,
): string[] =>
  Object.entries(chatrooms)
    .filter(([, data]) => data.np)
    .map(([channel]) => channel);

const failed = (channelName: string): KickPollFailure => ({
  channelName,
  ok: false,
});

// HTTP 200 + {"data": null} is offline. Any other non-success keeps the
// channel's previous value (the caller treats ok:false as "no change").
export const parseLivestreamResponse = (
  channelName: string,
  status: number,
  raw: string,
): KickPollResult => {
  if (status !== 200) return failed(channelName);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return failed(channelName);
  }
  if (!isRecord(body) || !("data" in body)) return failed(channelName);

  const { data } = body;
  if (data == null) return { channelName, ok: true, stream: null };
  if (!isRecord(data)) return failed(channelName);

  const category = data.category;
  const thumbnail = data.thumbnail;
  if (
    !isFiniteNumber(data.id) ||
    !isString(data.session_title) ||
    !isString(data.created_at) ||
    !isFiniteNumber(data.viewers) ||
    !isString(data.playback_url) ||
    data.playback_url.length === 0 ||
    !isRecord(category) ||
    !isFiniteNumber(category.id) ||
    !isString(category.name) ||
    !isString(category.slug) ||
    !isRecord(thumbnail) ||
    !isString(thumbnail.src) ||
    thumbnail.src.length === 0
  ) {
    return failed(channelName);
  }

  return {
    channelName,
    ok: true,
    stream: {
      id: data.id,
      channelName,
      session_title: data.session_title,
      created_at: data.created_at,
      viewers: data.viewers,
      playback_url: data.playback_url,
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
      },
      thumbnail: {
        src: thumbnail.src,
        srcset: isString(thumbnail.srcset) ? thumbnail.srcset : "",
      },
    },
  };
};

// vod id lives on the channel info payload, not the livestream payload.
// Ignore it when it belongs to a different livestream than the one just seen.
export const parseVodIdFromInfo = (
  status: number,
  raw: string,
  livestreamId: number,
): string | null => {
  if (status !== 200) return null;

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(body) || !isRecord(body.livestream)) return null;
  if (body.livestream.id !== livestreamId) return null;

  const vodId = body.livestream.vod_id;
  if (!isString(vodId) || vodId.length === 0) return null;
  return vodId;
};

const retainVodId = (
  stream: RemoteKickLivestream,
  previous: RemoteKickLivestream | undefined,
): RemoteKickLivestream => {
  if (stream.vodId) return stream;
  if (!previous || previous.id !== stream.id || !previous.vodId) return stream;
  return { ...stream, vodId: previous.vodId };
};

// A row kept only because its fetch failed is dropped once that failure has
// lasted this long. A successful poll of any other channel is what applies it.
export const KICK_FAILURE_RETAIN_MS = 15 * 60 * 1000;

// Two poll passes. A slow pass stays under this, so the sidebar does not
// flash "delayed" while the loop is still writing.
export const KICK_STATUS_DELAYED_MS = 8 * 60 * 1000;

export const KICK_STATUS_DELAYED = "Kick status delayed";

// kickSavedAt 0 means this process has no saved list yet. Exactly 8 minutes
// is still on time; anything older is the delayed line.
export const kickStatusText = (
  kickSavedAt: number,
  now = Date.now(),
): string =>
  kickSavedAt === 0 || now - kickSavedAt > KICK_STATUS_DELAYED_MS
    ? KICK_STATUS_DELAYED
    : "";

export const KICK_BACKOFF_STEPS_MS = [5_000, 10_000, 20_000, 30_000] as const;
export const KICK_BACKOFF_CAP_MS = 30_000;

const retryAfterMs = (header: string, now: number): number | null => {
  const trimmed = header.trim();
  if (trimmed.length === 0) return null;
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return parsed - now;
};

// Retry-After is used only when it asks for a pause of 1ms..30s. Zero, a
// missing header, a past date, or anything larger falls through to 5s, 10s,
// 20s, then 30s.
export const backoffDelayMs = (
  retryAfter: string | null | undefined,
  consecutive429s: number,
  now = Date.now(),
): number => {
  if (retryAfter != null) {
    const parsed = retryAfterMs(retryAfter, now);
    if (parsed != null && parsed > 0 && parsed <= KICK_BACKOFF_CAP_MS) {
      return parsed;
    }
  }
  const step = Math.min(
    Math.max(consecutive429s, 1),
    KICK_BACKOFF_STEPS_MS.length,
  );
  return KICK_BACKOFF_STEPS_MS[step - 1]!;
};

// Previously-live channels first, in the order they are already stored.
// Names not in the np list are left out; the rest keep file order.
export const orderKickPoll = (
  channels: readonly string[],
  previouslyLive: readonly Pick<RemoteKickLivestream, "channelName">[],
): { priority: string[]; rest: string[] } => {
  const canonical = new Map<string, string>();
  for (const channel of channels) {
    const key = channel.toLowerCase();
    if (!canonical.has(key)) canonical.set(key, channel);
  }

  const priority: string[] = [];
  const seen = new Set<string>();
  for (const stream of previouslyLive) {
    const key = stream.channelName.toLowerCase();
    if (seen.has(key)) continue;
    const name = canonical.get(key);
    if (!name) continue;
    seen.add(key);
    priority.push(name);
  }

  const rest = channels.filter((channel) => !seen.has(channel.toLowerCase()));
  return { priority, rest };
};

export interface ApplyKickPollOptions {
  // A mid-pass batch must keep rows it has not checked yet. The final pass
  // drops np channels that are no longer in the file.
  dropUnmentioned: boolean;
  now?: number;
}

const failureIsExpired = (stream: RemoteKickLivestream, now: number): boolean =>
  typeof stream.fetchedAt === "number" &&
  now - stream.fetchedAt > KICK_FAILURE_RETAIN_MS;

// null means "do not replace the stored list": every checked channel failed,
// so the previous list and its timestamp stay as they are.
export const applyKickPollBatch = (
  previous: readonly RemoteKickLivestream[],
  results: readonly KickPollResult[],
  options: ApplyKickPollOptions,
): RemoteKickLivestream[] | null => {
  if (!results.some((result) => result.ok)) return null;

  const now = options.now ?? Date.now();
  const previousByName = new Map(
    previous.map((stream) => [stream.channelName, stream]),
  );
  const mentioned = new Set<string>();
  const merged: RemoteKickLivestream[] = [];

  for (const result of results) {
    mentioned.add(result.channelName);
    if (!result.ok) {
      const kept = previousByName.get(result.channelName);
      if (!kept || failureIsExpired(kept, now)) continue;
      merged.push(kept);
      continue;
    }
    if (result.stream) {
      const next = retainVodId(
        result.stream,
        previousByName.get(result.channelName),
      );
      merged.push({ ...next, fetchedAt: now });
    }
  }

  if (!options.dropUnmentioned) {
    for (const stream of previous) {
      if (mentioned.has(stream.channelName)) continue;
      merged.push(stream);
    }
  }

  merged.sort((a, b) => b.viewers - a.viewers);
  return merged;
};

export const mergeKickPoll = (
  previous: readonly RemoteKickLivestream[],
  results: readonly KickPollResult[],
  now = Date.now(),
): RemoteKickLivestream[] | null =>
  applyKickPollBatch(previous, results, { dropUnmentioned: true, now });

export const toKickLiveStream = (
  stream: RemoteKickLivestream,
): KickLiveApiStream => {
  const apiStream: KickLiveApiStream = {
    channelName: stream.channelName,
    title: stream.session_title,
    viewers: stream.viewers,
    startedAt: stream.created_at,
    category: stream.category.name,
    thumbnail: stream.thumbnail.src,
    playbackUrl: stream.playback_url,
    id: stream.id,
  };
  if (stream.vodId) apiStream.vodId = stream.vodId;
  return apiStream;
};

export const toKickLiveResponse = (
  streams: readonly RemoteKickLivestream[],
  savedAtMs: number,
): KickLiveApiResponse => ({
  savedAt: new Date(savedAtMs).toISOString(),
  streams: [...streams]
    .sort((a, b) => b.viewers - a.viewers)
    .map(toKickLiveStream),
});
