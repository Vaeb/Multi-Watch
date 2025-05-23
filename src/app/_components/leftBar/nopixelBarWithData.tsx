"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { type RemoteReceived } from "../../../types";
import { hydrateStreams } from "../../actions/hydrateStreams";
import { getDateString, log } from "../../utils/log";
import { NOPIXEL_DATA_INTERVAL } from "../../constants";
import { shiftableInterval } from "../../utils/shiftableInterval";
import { randomInt } from "../../utils/randomInt";
import { type KickState } from "../../stores/kickStore";
import { fetchKickLive } from "../../utils/fetchKickLive";
import { updateServerKickLive } from "../../actions/updateServerKickLive";
import { NopixelBar } from "./nopixelBar";

function NopixelBarWithDataComponent({
  receivedData: _receivedData,
  chatrooms,
}: {
  receivedData: RemoteReceived;
  chatrooms: KickState["chatrooms"];
}) {
  const [receivedData, setReceivedData] = useState(_receivedData);
  const [hydrateTime, setHydrateTime] = useState(+new Date());

  const timeFormatted = new Date(hydrateTime)
    .toLocaleString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    })
    .replace(" ", "\n");

  /**
   * All clients periodically get kick streams from server.
   * Also includes whether the server's kick stream cache needs to be updated by this client.
   */
  const hydrateStreamsHandler = useCallback(
    async (_received?: RemoteReceived) => {
      const hydrateTimeNew = +new Date();
      const received = _received ?? (await hydrateStreams());
      log(
        "[NopixelBar] Hydrating streams from server:",
        received.parsed.streams.length,
        "from",
        getDateString(new Date(received.time)),
      );
      setReceivedData(received);
      setHydrateTime(hydrateTimeNew);
      return received;
    },
    [],
  );

  // A client will periodically fetch the live kick streams by making status web requests for each of the kick streams listed in Chatrooms.
  // This data will then be sent to the server to be stored and passed back to all clients.
  const updateLiveKickStreams = useCallback(async () => {
    log("[NopixelBar] Needs kick live streams...");
    const kickStreams = await fetchKickLive(chatrooms);
    const received = await updateServerKickLive(kickStreams);
    log(
      "[NopixelBar] Updated server kick streams",
      kickStreams.map((stream) => `${stream.channelName} ${stream.viewers}`),
    );
    hydrateStreamsHandler(received).catch(console.error);
  }, [hydrateStreamsHandler, chatrooms]);

  useEffect(() => {
    // resolves also 'needs kick live data', aka has it been >5 minutes since server received live data
    // if so, lookup kick data & send in server action to server to store and pass back to all clients
    // then shift interval by random amount from NOPIXEL_DATA_INTERVAL*0.25 to NOPIXEL_DATA_INTERVAL*0.75
    const { clear, shiftOnce } = shiftableInterval(() => {
      hydrateStreamsHandler()
        .then((received) => {
          // update server's cache of kick streams by fetching on client
          if (received.needsKickLiveStreams) {
            shiftOnce(
              randomInt(
                NOPIXEL_DATA_INTERVAL * 0.25,
                NOPIXEL_DATA_INTERVAL * 0.75,
              ),
            );
            updateLiveKickStreams().catch(console.error);
          }
        })
        .catch(console.error);
    }, NOPIXEL_DATA_INTERVAL);

    if (_receivedData.needsKickLiveStreams) {
      // update server's cache of kick streams by fetching on client
      updateLiveKickStreams().catch(console.error);
    }

    return () => clear();
  }, [
    hydrateStreamsHandler,
    updateLiveKickStreams,
    _receivedData.needsKickLiveStreams,
  ]);

  return (
    <NopixelBar receivedData={receivedData} timeFormatted={timeFormatted} />
  );
}

export const NopixelBarWithData = memo(NopixelBarWithDataComponent);
