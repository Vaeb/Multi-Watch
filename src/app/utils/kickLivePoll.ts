import { promises as fs } from "fs";
import path from "path";
import { type GlobalData, type RemoteKickLivestream } from "../../types";
import {
  applyKickPollBatch,
  npKickChannels,
  orderKickPoll,
  parseLivestreamResponse,
  parseVodIdFromInfo,
  type KickPollResult,
} from "./kickLive";
import {
  getKickRequestQueue,
  touchKickPollHeartbeat,
} from "./kickRequestQueue";
import { log } from "./log";
import { sleep } from "./sleep";

// One pass over every NoPixel Kick channel. The target is a pass every 60s,
// but channels are fetched one at a time ~500ms apart, so a pass takes longer
// than that and the next one waits until this one has finished.
const PASS_INTERVAL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 10_000;
const KICK_USER_AGENT = "Mozilla/5.0";

const CHATROOMS_PATH = path.join(
  process.cwd(),
  "src/app/data/chatroomsJson.json",
);

export interface KickLivePollDeps {
  ensureLoaded: () => Promise<void>;
  readStreams: () => RemoteKickLivestream[];
  writeStreams: (streams: RemoteKickLivestream[]) => Promise<unknown>;
}

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

const readNpChannels = async (): Promise<string[]> => {
  const raw = await fs.readFile(CHATROOMS_PATH, "utf8");
  const chatrooms = JSON.parse(raw) as Record<string, { np?: boolean }>;
  return npKickChannels(chatrooms);
};

interface QueuedKickBody {
  status: number;
  raw: string;
  pauseMs: number;
  retryAfter: string | null;
}

const queuedKickGet = async (url: string): Promise<QueuedKickBody> => {
  const queue = getKickRequestQueue();
  return queue.enqueue(async () => {
    const response = await kickFetch(url);
    const retryAfter = response.headers.get("retry-after");
    const pauseMs = queue.noteResponse(response.status, retryAfter);
    const raw = await response.text();
    return { status: response.status, raw, pauseMs, retryAfter };
  });
};

const fetchLivestream = async (
  channelName: string,
): Promise<KickPollResult> => {
  const url = `https://kick.com/api/v2/channels/${encodeURIComponent(channelName)}/livestream`;
  try {
    const { status, raw, pauseMs, retryAfter } = await queuedKickGet(url);
    const result = parseLivestreamResponse(channelName, status, raw);
    if (!result.ok) {
      log(
        status === 429
          ? `[kickPoll] ${channelName} livestream failed (HTTP 429), pausing ${pauseMs}ms (Retry-After: ${retryAfter ?? "none"})`
          : `[kickPoll] ${channelName} livestream failed (HTTP ${status})`,
      );
    }
    return result;
  } catch (error) {
    log(
      `[kickPoll] ${channelName} livestream failed:`,
      error instanceof Error ? error.message : error,
    );
    return { channelName, ok: false };
  }
};

const fetchVodId = async (
  channelName: string,
  livestreamId: number,
): Promise<string | null> => {
  const url = `https://kick.com/api/v2/channels/${encodeURIComponent(channelName)}/info`;
  try {
    const { status, raw, pauseMs, retryAfter } = await queuedKickGet(url);
    const vodId = parseVodIdFromInfo(status, raw, livestreamId);
    if (!vodId) {
      log(
        status === 429
          ? `[kickPoll] ${channelName} info failed (HTTP 429), pausing ${pauseMs}ms (Retry-After: ${retryAfter ?? "none"})`
          : `[kickPoll] ${channelName} info had no vod id (HTTP ${status})`,
      );
    }
    return vodId;
  } catch (error) {
    log(
      `[kickPoll] ${channelName} info failed:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
};

const fillMissingVodIds = async (
  streams: readonly RemoteKickLivestream[],
): Promise<RemoteKickLivestream[]> => {
  const next = streams.slice();
  for (let i = 0; i < next.length; i++) {
    const stream = next[i]!;
    if (stream.vodId) continue;
    const vodId = await fetchVodId(stream.channelName, stream.id);
    if (vodId) next[i] = { ...stream, vodId };
  }
  return next;
};

const pollChannels = async (
  channels: readonly string[],
  progress: { done: number; total: number },
): Promise<KickPollResult[]> => {
  const results: KickPollResult[] = [];
  for (const channelName of channels) {
    results.push(await fetchLivestream(channelName));
    progress.done += 1;
    if (progress.done % 100 === 0) {
      log(`[kickPoll] ${progress.done}/${progress.total}`);
    }
  }
  return results;
};

const pollOnce = async (deps: KickLivePollDeps): Promise<void> => {
  const started = Date.now();
  touchKickPollHeartbeat(started);
  await deps.ensureLoaded();
  const channels = await readNpChannels();
  if (channels.length === 0) {
    log("[kickPoll] no NoPixel Kick channels to check");
    return;
  }

  // Order from the list loaded at the start. The merge below reads again so
  // a failed channel keeps the row held when that fetch finishes.
  const { priority, rest } = orderKickPoll(channels, deps.readStreams());
  log(
    `[kickPoll] checking ${channels.length} channels (${priority.length} previously live first)`,
  );

  const progress = { done: 0, total: channels.length };
  const priorityResults = await pollChannels(priority, progress);
  if (priorityResults.length > 0) {
    const priorityMerged = applyKickPollBatch(
      deps.readStreams(),
      priorityResults,
      { dropUnmentioned: false },
    );
    if (priorityMerged) {
      await deps.writeStreams(priorityMerged);
      log(`[kickPoll] saved priority batch (${priorityMerged.length} rows)`);
    } else {
      log(
        "[kickPoll] priority batch had no successful response; leaving the list unchanged",
      );
    }
  }

  const restResults = await pollChannels(rest, progress);
  const results = [...priorityResults, ...restResults];
  const failed = results.filter((result) => !result.ok).length;
  const merged = applyKickPollBatch(deps.readStreams(), results, {
    dropUnmentioned: true,
  });
  if (!merged) {
    log(
      `[kickPoll] all ${results.length} channels failed; keeping the previous list`,
    );
    return;
  }

  const streams = await fillMissingVodIds(merged);
  await deps.writeStreams(streams);
  const live = streams
    .map((stream) => `${stream.channelName} ${stream.viewers}`)
    .join(", ");
  log(
    `[kickPoll] saved ${streams.length} live (${failed} fetch failures) in ${Date.now() - started}ms${live ? `: ${live}` : ""}`,
  );
};

const pollLoop = async (deps: KickLivePollDeps): Promise<void> => {
  for (;;) {
    touchKickPollHeartbeat();
    const started = Date.now();
    try {
      await pollOnce(deps);
    } catch (error) {
      log(
        "[kickPoll] pass failed:",
        error instanceof Error ? error.message : error,
      );
    }
    const waitMs = PASS_INTERVAL_MS - (Date.now() - started);
    if (waitMs > 0) {
      touchKickPollHeartbeat();
      await sleep(waitMs);
    }
  }
};

export const startKickLivePoller = (deps: KickLivePollDeps): void => {
  if (globalData.kickPollerStarted) return;
  globalData.kickPollerStarted = true;
  void pollLoop(deps);
};
