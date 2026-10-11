import { type RemoteStream } from "../../types";

export const isNoPixelStreamAllowed = (
  factionFilter: string,
  stream: RemoteStream,
) => {
  if (factionFilter === "nponly") return stream.rpServer === "NP";
  if (factionFilter === "publicnp" || factionFilter === "international") {
    return stream.tagFactionSecondary === factionFilter;
  }
  if (stream.factionsMap[factionFilter]) return true;
  return factionFilter === "independent" && !!stream.factionsMap.othernp;
};

export const filterNoPixelStreamsByFaction = (
  streams: RemoteStream[],
  factionFilter: string,
) =>
  factionFilter === "allnopixel"
    ? streams
    : streams.filter((stream) => isNoPixelStreamAllowed(factionFilter, stream));
