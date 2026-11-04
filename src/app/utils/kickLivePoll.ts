import { promises as fs } from "fs";
import path from "path";
import { type GlobalData, type RemoteKickLivestream } from "../../types";
import {
  mergeKickPoll,
  npKickChannels,
  parseLivestreamResponse,
  parseVodIdFromInfo,
  type KickPollResult,
} from "./kickLive";
import { log } from "./log";
import { sleep } from "./sleep";

// One pass over every NoPixel Kick channel. The target is a pass every 60s,
// but channels are fetched one at a time ~500ms apart, so a pass takes longer
// than that and the next one waits until this one has finished.
const PASS_INTERVAL_MS = 60_000;
const REQUEST_SPACING_MS = 500;
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

const fetchLivestream = async (
  channelName: string,
): Promise<KickPollResult> => {
  const url = `https://kick.com/api/v2/channels/${encodeURIComponent(channelName)}/livestream`;
  try {
    const response = await kickFetch(url);
    const raw = await response.text();
    const result = parseLivestreamResponse(channelName, response.status, raw);
    if (!result.ok) {
      log(
        `[kickPoll] ${channelName} livestream failed (HTTP ${response.status})`,
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
    const response = await kickFetch(url);
    const raw = await response.text();
    const vodId = parseVodIdFromInfo(response.status, raw, livestreamId);
    if (!vodId) {
      log(
        `[kickPoll] ${channelName} info had no vod id (HTTP ${response.status})`,
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
    await sleep(REQUEST_SPACING_MS);
    const vodId = await fetchVodId(stream.channelName, stream.id);
    if (vodId) next[i] = { ...stream, vodId };
  }
  return next;
};

const pollOnce = async (deps: KickLivePollDeps): Promise<void> => {
  const started = Date.now();
  await deps.ensureLoaded();
  const channels = await readNpChannels();
  if (channels.length === 0) {
    log("[kickPoll] no NoPixel Kick channels to check");
    return;
  }

  log(`[kickPoll] checking ${channels.length} channels`);
  const results: KickPollResult[] = [];
  for (let i = 0; i < channels.length; i++) {
    const channelName = channels[i]!;
    results.push(await fetchLivestream(channelName));
    if ((i + 1) % 100 === 0) {
      log(`[kickPoll] ${i + 1}/${channels.length}`);
    }
    if (i < channels.length - 1) await sleep(REQUEST_SPACING_MS);
  }

  const failed = results.filter((result) => !result.ok).length;
  // Read after the fetches so a client push during the pass is the base
  // that failed channels fall back to.
  const merged = mergeKickPoll(deps.readStreams(), results);
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
    if (waitMs > 0) await sleep(waitMs);
  }
};

export const startKickLivePoller = (deps: KickLivePollDeps): void => {
  if (globalData.kickPollerStarted) return;
  globalData.kickPollerStarted = true;
  void pollLoop(deps);
};
