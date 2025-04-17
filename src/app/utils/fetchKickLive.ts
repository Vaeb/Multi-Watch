"use client";

import {
  type RemoteKickLivestream,
  type RemoteKickLivestreamData,
} from "../../types";
import { type KickState } from "../stores/kickStore";
import { sleep } from "./sleep";

// Make a request to the Kick API to fetch the streams
// This should only be needed if the server's cache of kick streams becomes outdated and needs updating by a client
// (FYI: Kick API can only be accessed client-side)
export const fetchKickLive = async (
  chatrooms: KickState["chatrooms"],
): Promise<RemoteKickLivestream[]> => {
  const channels = Object.entries(chatrooms)
    .filter(([_, data]) => data.np)
    .map(([channel]) => channel);

  const kickStreams: RemoteKickLivestream[] = [];
  const delayMs = 501;

  for (const channel of channels) {
    const url = `https://kick.com/api/v2/channels/${channel}/livestream`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(
          `[fetchKickLive] Failed to fetch ${channel}: ${response.status} ${response.statusText}`,
        );
        continue; // Skip to the next channel on fetch error
      }
      const stream = (await response.json()).data as RemoteKickLivestreamData;
      if (stream != null) {
        kickStreams.push({ ...stream, channelName: channel });
      }
    } catch (error) {
      console.error(`[fetchKickLive] Error fetching ${channel}:`, error);
      // Optionally handle the error further or just continue
    }

    // Wait before the next request
    await sleep(delayMs);
  }

  kickStreams.sort((a, b) => (b.viewers ?? -1) - (a.viewers ?? -1));

  return kickStreams;
};
