import "server-only";

import { promises as fs } from "fs";
import { log } from "./log";
import {
  type RemoteKickLivestreamData,
  type ChatroomsJson,
  type RemoteKickLivestream,
} from "../../types";
import { ghostFetch } from "./ghostFetch";

let cachedKickStreams: RemoteKickLivestreamData[] = [];

const checkStreamsLive = async (channels: string[]) => {
  try {
    // https://kick.com/api/v1/channels/4head
    const urls = channels.map(
      (channel) => `https://kick.com/api/v2/channels/${channel}/livestream`,
    );

    // console.trace();
    // log("[checkStreamLive] Checking stream at", urls);

    const _results = await ghostFetch(urls);

    if (_results === "error" || _results?.length === 0) {
      return cachedKickStreams;
    }

    const results: RemoteKickLivestreamData[] = _results.map((_data, i) => {
      const channel = channels[i]!;

      let data: RemoteKickLivestreamData;
      if (_data === "error") {
        data =
          cachedKickStreams.find((data) => data?.channelName === channel) ??
          null;
      } else {
        data = _data;
      }

      if (data) {
        data.channelName = channel;
      }

      return data;
    });

    cachedKickStreams = results;
    // log(
    //   "[checkStreamLive] Got kick streams:",
    //   results.map((data, i) => `${channels[i]}: ${data?.session_title}`),
    // );

    return results;
  } catch (err) {
    log("[checkStreamLive] error:", err);
    return cachedKickStreams;
  }
};

export const checkAllKickStreamsLive = async () => {
  const chatroomsJson = await fs.readFile(
    process.cwd() + "/src/app/data/chatroomsJson.json",
    "utf8",
  );
  const chatrooms = JSON.parse(chatroomsJson) as Record<string, ChatroomsJson>;
  // const chatrooms = { panicpatty: 1234, "4head": 2345 };

  const _kickStreams = await checkStreamsLive(
    Object.entries(chatrooms)
      .filter(([_, chatroom]) => chatroom.np)
      .map(([channel]) => channel),
  );

  const kickStreams = (
    _kickStreams.filter((stream) => stream) as RemoteKickLivestream[]
  ).sort((a, b) => (b.viewers ?? -1) - (a.viewers ?? -1));

  log(
    "[checkAllStreamsLive] Sorted streams:",
    kickStreams.map((stream) => stream.channelName),
  );

  return kickStreams;
};

// const init = () => {
//   if (typeof window !== "undefined") {
//     return;
//   }

//   checkAllStreamsLive();

//   setInterval(() => {
//     dataQueryCallback((parsed) => {
//       cachedData = parsed;
//       cachedTime = +new Date();
//     });
//   }, NOPIXEL_DATA_INTERVAL);
// };

// init();
