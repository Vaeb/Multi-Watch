import { type ChatroomsInfo, type RemoteStream } from "../../types";
import { hasAnyAssumeFaction, hasAssumeFaction } from "./assumeFaction";

export const isNoPixelStreamAllowed = (
  factionFilter: string,
  chatroomsLower: Record<string, ChatroomsInfo>,
  stream: RemoteStream,
) => {
  let allowStream = false;

  if (factionFilter === "nponly") {
    allowStream = !stream.rpServer || stream.rpServer === "NP";
  } else {
    if (stream.faction === "Kick") {
      const chatroom = chatroomsLower[stream.channelName.toLowerCase()];
      allowStream =
        factionFilter !== "independent"
          ? hasAssumeFaction(chatroom, factionFilter)
          : !hasAnyAssumeFaction(chatroom);
    } else {
      if (factionFilter === "publicnp") {
        allowStream = stream.tagFactionSecondary === "publicnp";
      } else if (factionFilter === "international") {
        allowStream = stream.tagFactionSecondary === "international";
      } else {
        if (stream.factionsMap[factionFilter]) {
          allowStream = true;
        } else if (
          factionFilter === "independent" &&
          stream.factionsMap.othernp
        ) {
          allowStream = true;
        }
      }
    }
  }

  return allowStream;
};

export const filterNoPixelStreamsByFaction = (
  streams: RemoteStream[],
  factionFilter: string,
  chatroomsLower: Record<string, ChatroomsInfo>,
) =>
  factionFilter === "allnopixel"
    ? streams
    : streams.filter((stream) =>
        isNoPixelStreamAllowed(factionFilter, chatroomsLower, stream),
      );
