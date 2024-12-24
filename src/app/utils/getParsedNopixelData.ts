import "server-only";

import {
  type RemoteReceived,
  type RemoteLive,
  type RemoteParsed,
} from "../../types";
import { NOPIXEL_DATA_INTERVAL } from "../constants";
import { log } from "./log";

const isLocalhost = process.env.LOCALHOST === "1";

log("Node env:", isLocalhost);

let cachedData: RemoteParsed | undefined;
let cachedTime = 0;
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

    // console.log("[getData]", Object.keys(data));
    return data;
  } catch (err) {
    log("[getData] error:", err);
    throw err;
  }
};

const queryParsedNopixelData = async () => {
  const data = await getData();

  const { streams, useColorsDark } = data || {};

  const parsed: RemoteParsed = {
    streams: streams.filter(
      (stream) =>
        (stream.noOthersInclude &&
          stream.noPublicInclude &&
          stream.noInternationalInclude) ||
        stream.wlOverride,
    ),
    useColorsDark,
  };

  log("Got data!", parsed.streams?.length);

  return parsed;
};

const dataQueryCallback = (callback: (parsed: RemoteParsed) => void) => {
  queryParsedNopixelData().then(callback).catch(console.error);
};

export const init = () => {
  if (typeof window !== "undefined") {
    return;
  }

  dataQueryCallback((parsed) => {
    const isFirst = cachedData === undefined;
    cachedData = parsed;
    cachedTime = +new Date();
    if (isFirst) {
      cacheResolve({ parsed: cachedData, time: cachedTime });
    }
  });

  setInterval(() => {
    dataQueryCallback((parsed) => {
      cachedData = parsed;
      cachedTime = +new Date();
    });
  }, NOPIXEL_DATA_INTERVAL);
};

export const getParsedNopixelData = async (): Promise<RemoteReceived> => {
  if (cachedData !== undefined) {
    return { parsed: cachedData, time: cachedTime };
  }

  return cachePromise;
};

init();
