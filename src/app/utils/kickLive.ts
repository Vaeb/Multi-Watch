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

// null means "do not replace the stored list": every checked channel failed,
// so the previous list and its timestamp stay as they are.
export const mergeKickPoll = (
  previous: readonly RemoteKickLivestream[],
  results: readonly KickPollResult[],
): RemoteKickLivestream[] | null => {
  if (!results.some((result) => result.ok)) return null;

  const previousByName = new Map(
    previous.map((stream) => [stream.channelName, stream]),
  );
  const merged: RemoteKickLivestream[] = [];

  for (const result of results) {
    if (!result.ok) {
      const kept = previousByName.get(result.channelName);
      if (kept) merged.push(kept);
      continue;
    }
    if (result.stream) {
      merged.push(
        retainVodId(result.stream, previousByName.get(result.channelName)),
      );
    }
  }

  merged.sort((a, b) => b.viewers - a.viewers);
  return merged;
};

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
