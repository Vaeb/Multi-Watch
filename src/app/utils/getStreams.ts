import "server-only";

import { promises as fs } from "fs";
import {
  type RemoteReceived,
  type RemoteLive,
  type RemoteParsed,
  type RemoteStream,
  type RemoteKickLivestream,
  type ChatroomsInfo,
  type GlobalData,
  type CachedStreams,
  type RemoteTnoData,
} from "../../types";
import { IS_LOCALHOST, NOPIXEL_DATA_INTERVAL } from "../constants";
import { createKickStreamParser } from "./kickStreamParser";
import {
  isKickSnapshotCurrent,
  kickSnapshotPath,
  loadKickSnapshot,
  saveKickSnapshot,
} from "./kickSnapshot";
import { log } from "./log";

const globalData = global as GlobalData;

const NOPIXEL_API_URL = IS_LOCALHOST
  ? "https://vaeb.io:3030"
  : "http://localhost:3029";

// Used until the character data has been fetched
const fallbackKickStreamParser = createKickStreamParser();

const twitchReady = (): Promise<CachedStreams> => {
  if (!globalData.twitchReady) {
    globalData.twitchReady = new Promise((resolve) => {
      globalData.resolveTwitch = resolve;
    });
  }
  return globalData.twitchReady;
};

const publishTwitch = (parsed: RemoteParsed) => {
  const isFirst = globalData.cachedTwitch === undefined;
  const cachedTwitchTime = +new Date();
  globalData.cachedTwitch = parsed;
  globalData.cachedTwitchTime = cachedTwitchTime;
  if (!isFirst) return;
  void twitchReady();
  globalData.resolveTwitch?.({
    cachedTwitch: parsed,
    cachedTwitchTime,
  });
};

const updateKickStreamParser = async () => {
  try {
    const dataRaw = await fetch(`${NOPIXEL_API_URL}/tno_data`);
    const data = (await dataRaw.json()) as Partial<RemoteTnoData>;
    if (!data.npCharacters) {
      throw new Error("Response is missing npCharacters");
    }

    globalData.kickStreamParser = createKickStreamParser(data);
  } catch (err) {
    log("[updateKickStreamParser] error:", err);
  }
};

const getTwitchData = async () => {
  try {
    const url = `${NOPIXEL_API_URL}/live`;

    if (IS_LOCALHOST) {
      log("Fetching NoPixel data from", url);
    }

    const dataRaw = await fetch(url);
    const data = (await dataRaw.json()) as RemoteLive;
    data.useColorsDark.Kick = "#00e701";

    return data;
  } catch (err) {
    log("[getData] error:", err);
    throw err;
  }
};

const mergeKickIntoParsed = async (
  parsed: RemoteParsed,
  _kickStreams: RemoteKickLivestream[],
) => {
  parsed = { ...parsed };
  const streams = [...parsed.streams];
  parsed.streams = streams;

  streams.push({ viewers: Infinity } as RemoteStream);

  const chatroomsJson = await fs.readFile(
    process.cwd() + "/src/app/data/chatroomsJson.json",
    "utf8",
  );
  const chatrooms = JSON.parse(chatroomsJson) as Record<string, ChatroomsInfo>;
  // Map of kick streamer names (lowercase) to their info (including faction)
  const chatroomsLower = Object.fromEntries(
    Object.entries(chatrooms).map(([channel, data]) => [
      channel.toLowerCase(),
      data,
    ]),
  );

  const parseKickStream =
    globalData.kickStreamParser ?? fallbackKickStreamParser;
  const kickStreams = _kickStreams.map((kickStream) =>
    parseKickStream(
      kickStream,
      chatroomsLower[kickStream.channelName.toLowerCase()],
    ),
  );

  // Collect factions slugs for live Kick streamers
  const liveKickFactions = new Set(
    kickStreams.flatMap((stream) => stream.factions),
  );

  // Update filterFactions based on live Kick streamers and maintain order
  const updatedFilterFactions = parsed.filterFactions.map((factionInfo) => {
    const [slug, name, enabled, order] = factionInfo;
    // Enable faction if it was already enabled OR if a Kick streamer from that faction is live
    const shouldBeEnabled = enabled || liveKickFactions.has(slug);
    return [slug, name, shouldBeEnabled, order] as [
      string,
      string,
      boolean,
      number,
    ];
  });

  // Sort by the original order field to maintain position, keeping enabled factions first
  updatedFilterFactions.sort((a, b) => {
    const enabledA = a[2];
    const enabledB = b[2];
    return enabledA === enabledB ? a[3] - b[3] : enabledA ? -1 : 1;
  });

  parsed.filterFactions = updatedFilterFactions;

  let kickStreamIdx = 0;
  let kickStreamNext = kickStreams[kickStreamIdx];

  for (let i = 0; i < streams.length; i++) {
    if (!kickStreamNext) break;
    const stream = streams[i]!;
    if (stream.viewers < kickStreamNext.viewers) {
      streams.splice(i, 0, kickStreamNext);
      kickStreamIdx++;
      kickStreamNext = kickStreams[kickStreamIdx];
    }
  }

  streams.pop();

  // `streams` is the array on `parsed`. Append in place so kick streams that
  // sit below every Twitch stream stay in the list handed to clients.
  if (kickStreamNext) {
    streams.push(...kickStreams.slice(kickStreamIdx));
  }

  return parsed;
};

const getParsedTwitchData = async () => {
  const data = await getTwitchData();

  const { streams, filterFactions, useColorsDark } = data || {};

  filterFactions[0]![1] = "Press to Filter by Group";
  if (filterFactions[2]![0] === "publicnp") filterFactions.splice(2, 1);
  if (filterFactions[1]![0] === "alltwitch") filterFactions.splice(1, 1);

  const parsed: RemoteParsed = {
    streams: streams.filter(
      (stream) =>
        (stream.noOthersInclude &&
          stream.noPublicInclude &&
          stream.noInternationalInclude) ||
        stream.wlOverride,
    ),
    filterFactions,
    useColorsDark,
  };

  if (!parsed.streams?.length) {
    log("[getStreams] No parsed twitch data!", parsed.streams?.length);
  }

  return parsed;
};

const getParsedTwitchDataCb = (
  callback: (parsed: RemoteParsed) => void | Promise<void>,
) => {
  getParsedTwitchData().then(callback).catch(console.error);
};

const loadKickIntoMemory = async () => {
  const snapshotPath = kickSnapshotPath();
  const snapshot = await loadKickSnapshot(snapshotPath);
  if (snapshot) {
    globalData.cachedKickStreams = snapshot.streams;
    globalData.cachedKickTime = snapshot.time;
    log(
      `[Init] Loaded ${snapshot.streams.length} kick streams from ${snapshotPath} (saved ${snapshot.time})`,
    );
  } else {
    globalData.cachedKickStreams = [];
    globalData.cachedKickTime = 0;
    log(`[Init] No kick snapshot at ${snapshotPath}; starting empty`);
  }
};

// One load per process, shared across the instrumentation bundle and the
// request bundle. A request that arrives while startup is still reading the
// file waits for that read instead of answering with an empty list.
export const ensureKickSnapshot = (): Promise<void> => {
  if (typeof window !== "undefined") return Promise.resolve();
  globalData.kickInitPromise ??= loadKickIntoMemory();
  return globalData.kickInitPromise;
};

const start = async () => {
  log(
    `[Init] Localhost: ${IS_LOCALHOST} | Node env: ${process.env.NODE_ENV} | Next.js runtime: ${process.env.NEXT_RUNTIME}`,
  );

  await ensureKickSnapshot();
  if (globalData.kickBackgroundStarted) return;
  globalData.kickBackgroundStarted = true;
  if (!globalData.connected) globalData.connected = 0;

  updateKickStreamParser().catch(console.error);

  getParsedTwitchDataCb(publishTwitch);

  setInterval(() => {
    updateKickStreamParser().catch(console.error);
    getParsedTwitchDataCb(publishTwitch);
    log(`[getStreams] Clients:`, globalData.connected);
    globalData.connected = 0;
  }, NOPIXEL_DATA_INTERVAL);
};

export const init = (): Promise<void> => {
  if (typeof window !== "undefined") return Promise.resolve();
  globalData.kickServerInit ??= start();
  return globalData.kickServerInit;
};

const _getStreams = async (): Promise<RemoteReceived> => {
  const needsKickLiveStreams = !isKickSnapshotCurrent(
    globalData.cachedKickTime ?? 0,
  );

  const { cachedTwitch, cachedTwitchTime } =
    globalData.cachedTwitch !== undefined &&
    globalData.cachedTwitchTime !== undefined
      ? {
          cachedTwitch: globalData.cachedTwitch,
          cachedTwitchTime: globalData.cachedTwitchTime,
        }
      : await twitchReady();

  const mergedStreams = await mergeKickIntoParsed(
    cachedTwitch,
    globalData.cachedKickStreams,
  );

  // Read chatrooms data from file system
  const chatroomsJson = await fs.readFile(
    process.cwd() + "/src/app/data/chatroomsJson.json",
    "utf8",
  );
  const chatrooms = JSON.parse(chatroomsJson) as Record<string, ChatroomsInfo>;

  return {
    parsed: mergedStreams,
    time: cachedTwitchTime,
    needsKickLiveStreams,
    chatrooms,
  };
};

export const getStreams = async (): Promise<RemoteReceived> => {
  await ensureKickSnapshot();
  globalData.connected = (globalData.connected || 0) + 1;

  // log(
  //   "[getParsedNopixelData] Server responding with cached streams:",
  //   mergedStreams.streams.length,
  //   cachedTwitch.streams.length,
  //   globalData.cachedKickStreams.length,
  //   needsKickLiveStreams,
  // );

  return _getStreams();
};

export async function setKickStreams(
  kickStreams: RemoteKickLivestream[],
  hydrateReceived: true,
): Promise<RemoteReceived>;
export async function setKickStreams(
  kickStreams: RemoteKickLivestream[],
  hydrateReceived: false,
): Promise<undefined>;
export async function setKickStreams(
  kickStreams: RemoteKickLivestream[],
  hydrateReceived: true | false,
) {
  await ensureKickSnapshot();
  const savedAt = +new Date();
  globalData.cachedKickStreams = kickStreams;
  globalData.cachedKickTime = savedAt;
  // log("[setKickStreams] Set kick streams:", kickStreams.length);

  try {
    await saveKickSnapshot({ streams: kickStreams, time: savedAt });
  } catch (err) {
    log("[setKickStreams] Failed to save kick snapshot:", err);
  }

  if (hydrateReceived === true) {
    return _getStreams();
  }

  return undefined;
}
