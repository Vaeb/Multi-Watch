"use client";

import {
  type RemoteKickLivestream,
  type RemoteKickLivestreamData,
} from "../../types";
import { type KickState } from "../stores/kickStore";

export const fetchKickLive = async (
  chatrooms: KickState["chatrooms"],
): Promise<RemoteKickLivestream[]> => {
  const channels = Object.entries(chatrooms)
    .filter(([_, data]) => data.np)
    .map(([channel]) => channel);

  const urls = channels.map(
    (channel) => `https://kick.com/api/v2/channels/${channel}/livestream`,
  );

  const kickStreams: RemoteKickLivestream[] = (
    await Promise.all(
      urls.map(async (url, i) => {
        const stream = (await (await fetch(url)).json())
          .data as RemoteKickLivestreamData;
        return stream != null ? { ...stream, channelName: channels[i]! } : null;
      }),
    )
  ).filter((stream) => stream != null);

  kickStreams.sort((a, b) => (b.viewers ?? -1) - (a.viewers ?? -1));

  return kickStreams;
};
