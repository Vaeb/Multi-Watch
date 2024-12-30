import "server-only";

import {
  type RemoteReceived,
  type RemoteLive,
  type RemoteParsed,
  type RemoteStream,
  type RemoteKickLivestream,
} from "../../types";
import { IS_LOCALHOST, NOPIXEL_DATA_INTERVAL } from "../constants";
import { log } from "./log";

interface CachedStreams {
  cachedTwitch: RemoteParsed;
  cachedTwitchTime: number;
}

type GlobalData = typeof global &
  Partial<CachedStreams> & {
    cachedKickStreams: RemoteKickLivestream[];
    cachedKickTime: number;
  };

const globalData = global as GlobalData;

let cacheResolve: (value: CachedStreams | PromiseLike<CachedStreams>) => void;
const cachePromise = new Promise<CachedStreams>((resolve) => {
  cacheResolve = resolve;
});

const getTwitchData = async () => {
  try {
    const url = IS_LOCALHOST
      ? "https://vaeb.io:3030/live"
      : "http://localhost:3029/live";

    // console.trace();
    log("Fetching NoPixel data from", url);

    const dataRaw = await fetch(url);
    const data = (await dataRaw.json()) as RemoteLive;
    data.useColorsDark.Kick = "#00e701";

    // log("[getData]", Object.keys(data));
    return data;
  } catch (err) {
    log("[getData] error:", err);
    throw err;
  }
};

const mergeKickIntoParsed = (
  parsed: RemoteParsed,
  _kickStreams: RemoteKickLivestream[],
) => {
  parsed = { ...parsed };
  let streams = [...parsed.streams];
  parsed.streams = streams;

  streams.push({ viewers: Infinity } as RemoteStream);

  const kickStreams = _kickStreams.map(
    (_kickStream) =>
      ({
        channelName: _kickStream.channelName,
        viewers: _kickStream.viewers,
        title: _kickStream.session_title,
        profileUrl: _kickStream.thumbnail.src,
        tagText: "Kick",
        faction: "Kick",
      }) as RemoteStream,
  );

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

  if (kickStreamNext) {
    streams = streams.concat(kickStreams.slice(kickStreamIdx));
  }

  return parsed;
};

const getParsedTwitchData = async () => {
  const data = await getTwitchData();

  const { streams, filterFactions, useColorsDark } = data || {};

  filterFactions[0]![1] = "All NoPixel Groups";
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

  log("[getStreams] Got twitch data!", parsed.streams?.length);

  return parsed;
};

const getParsedTwitchDataCb = (
  callback: (parsed: RemoteParsed) => void | Promise<void>,
) => {
  getParsedTwitchData().then(callback).catch(console.error);
};

export const init = async () => {
  if (typeof window !== "undefined") {
    return;
  }

  log(
    `[Init] Localhost: ${IS_LOCALHOST} | Node env: ${process.env.NODE_ENV} | Next.js runtime: ${process.env.NEXT_RUNTIME}`,
  );

  if (!globalData.cachedKickStreams) globalData.cachedKickStreams = [];
  if (!globalData.cachedKickTime) globalData.cachedKickTime = 0;

  getParsedTwitchDataCb(async (parsed) => {
    const isFirst = globalData.cachedTwitch === undefined;
    globalData.cachedTwitch = parsed;
    globalData.cachedTwitchTime = +new Date();
    if (isFirst) {
      cacheResolve({
        cachedTwitch: globalData.cachedTwitch,
        cachedTwitchTime: globalData.cachedTwitchTime,
      });
    }
  });

  setInterval(() => {
    getParsedTwitchDataCb((parsed) => {
      globalData.cachedTwitch = parsed;
      globalData.cachedTwitchTime = +new Date();
    });
  }, NOPIXEL_DATA_INTERVAL);
};

export const getStreams = async (): Promise<RemoteReceived> => {
  const needsKickLiveStreams =
    +new Date() - globalData.cachedKickTime > NOPIXEL_DATA_INTERVAL - 1000 * 10;

  const { cachedTwitch, cachedTwitchTime } =
    globalData.cachedTwitch !== undefined
      ? (globalData as GlobalData & CachedStreams)
      : await cachePromise;

  const mergedStreams = mergeKickIntoParsed(
    cachedTwitch,
    globalData.cachedKickStreams,
  );

  log(
    "[getParsedNopixelData] Server responding with cached streams:",
    mergedStreams.streams.length,
    cachedTwitch.streams.length,
    globalData.cachedKickStreams.length,
    needsKickLiveStreams,
  );

  return {
    parsed: mergedStreams,
    time: cachedTwitchTime,
    needsKickLiveStreams,
  };
};

export const setKickStreams = (kickStreams: RemoteKickLivestream[]) => {
  globalData.cachedKickStreams = kickStreams;
  globalData.cachedKickTime = +new Date();
  log("[setKickStreams] Set kick streams:", kickStreams.length);
};
