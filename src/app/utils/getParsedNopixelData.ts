import { type RemoteLive, type RemoteParsed } from "../../types";
import { log } from "./log";

const env = process.env.NODE_ENV || "development";

log("Env:", env);

const getData = async () => {
  const url =
    env === "development"
      ? "https://vaeb.io:3030/live"
      : "http://localhost:3029/live";

  log("Fetching NoPixel data from", url);

  const dataRaw = await fetch(url);
  const data = (await dataRaw.json()) as RemoteLive;

  log("Got data!", data?.streams?.length);

  // console.log("[getData]", Object.keys(data));
  return data;
};

export const getParsedNopixelData = async () => {
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

  return parsed;
};
