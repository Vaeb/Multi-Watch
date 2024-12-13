import { memo } from "react";
import { NopixelBar, type RemoteParsed, type RemoteStream } from "./nopixelBar";

export interface RemoteLive {
  streams: RemoteStream[];
  streamerData: Record<string, Partial<RemoteStream>>;
  tick: number;
  factionCount: Record<string, number>;
  npFactions: Record<string, number>;
  filterFactions: [string, string, boolean, number][];
  useColorsDark: Record<string, string>;
}

const getData = async () => {
  const dataRaw = await fetch("http://localhost:3029/live");
  const data = await dataRaw.json();
  console.log("[getData]", Object.keys(data));
  return data as RemoteLive;
};

async function NopixelBarWrapperComponent() {
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

  return <NopixelBar parsedData={parsed} />;
}

export const NopixelBarWrapper = memo(NopixelBarWrapperComponent);
