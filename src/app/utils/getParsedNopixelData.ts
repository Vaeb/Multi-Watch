import "server-only";

import {
  type RemoteReceived,
  type RemoteLive,
  type RemoteParsed,
  type RemoteStream,
  type RemoteKickLivestream,
} from "../../types";
import { NOPIXEL_DATA_INTERVAL } from "../constants";
import { log } from "./log";
import { checkAllKickStreamsLive } from "./checkAllKickStreamsLive";

const isLocalhost = process.env.LOCALHOST === "1";

const globalData = global as typeof global & {
  cachedData: RemoteParsed | undefined;
  cachedTime: number;
};

let cacheResolve: (value: RemoteReceived | PromiseLike<RemoteReceived>) => void;
const cachePromise = new Promise<RemoteReceived>((resolve) => {
  cacheResolve = resolve;
});

const getData = async () => {
  try {
    const url = isLocalhost
      ? "https://vaeb.io:3030/live"
      : "http://localhost:3029/live";

    // console.trace();
    log("Fetching NoPixel data from", url);

    const dataRaw = await fetch(url);
    const data = (await dataRaw.json()) as RemoteLive;
    data.useColorsDark.Kick = "#00e701";

    // console.log("[getData]", Object.keys(data));
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

const queryParsedNopixelData = async () => {
  const kickPromise = checkAllKickStreamsLive();
  const data = await getData();

  const { streams, useColorsDark } = data || {};

  let parsed: RemoteParsed = {
    streams: streams.filter(
      (stream) =>
        (stream.noOthersInclude &&
          stream.noPublicInclude &&
          stream.noInternationalInclude) ||
        stream.wlOverride,
    ),
    useColorsDark,
  };

  parsed = mergeKickIntoParsed(parsed, await kickPromise);

  log("Got data!", parsed.streams?.length);

  return parsed;
};

const dataQueryCallback = (
  callback: (parsed: RemoteParsed) => void | Promise<void>,
) => {
  queryParsedNopixelData().then(callback).catch(console.error);
};

export const init = async () => {
  if (typeof window !== "undefined") {
    return;
  }

  log(
    `[Init] Localhost: ${isLocalhost} | Node env: ${process.env.NODE_ENV} | Next.js runtime: ${process.env.NEXT_RUNTIME}`,
  );

  /* const testResults = await ghostFetch(
    ["https://kick.com/api/v2/channels/ming/livestream"],
    false,
  );
  log("Init result:", testResults);
  if (testResults === "error") {
    return;
  }

  log("Initialising data parser!");

  log("[INIT] Env", process.env.NEXT_RUNTIME); */

  dataQueryCallback(async (parsed) => {
    const isFirst = globalData.cachedData === undefined;
    globalData.cachedData = parsed;
    globalData.cachedTime = +new Date();
    if (isFirst) {
      cacheResolve({
        parsed: globalData.cachedData,
        time: globalData.cachedTime,
      });
    }
  });

  setInterval(() => {
    dataQueryCallback((parsed) => {
      globalData.cachedData = parsed;
      globalData.cachedTime = +new Date();
    });
  }, NOPIXEL_DATA_INTERVAL);
};

export const getParsedNopixelData = async (): Promise<RemoteReceived> => {
  if (globalData.cachedData !== undefined) {
    return { parsed: globalData.cachedData, time: globalData.cachedTime };
  }

  return cachePromise;
};
