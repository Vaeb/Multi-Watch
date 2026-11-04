"use client";

import { memo, useEffect, useState } from "react";
import { type RemoteReceived } from "../../../types";
import { hydrateStreams } from "../../actions/hydrateStreams";
import { getDateString, log } from "../../utils/log";
import { NOPIXEL_DATA_INTERVAL } from "../../constants";
import { shiftableInterval } from "../../utils/shiftableInterval";
import { useKickStore } from "../../stores/kickStore";
import { kickStatusText } from "../../utils/kickLive";
import { NopixelBar } from "./nopixelBar";
import { useStableCallback } from "~/app/hooks/useStableCallback";

function NopixelBarWithDataComponent({
  receivedData: _receivedData,
}: {
  receivedData: RemoteReceived;
}) {
  const [receivedData, setReceivedData] = useState(_receivedData);

  const timeFormatted = kickStatusText(receivedData.kickSavedAt);

  // The sidebar reads the server's list. It does not fetch Kick itself.
  const hydrateStreamsHandler = useStableCallback(
    async (_received?: RemoteReceived) => {
      const received = _received ?? (await hydrateStreams());
      log(
        "[NopixelBarWithData] Hydrating streams from server:",
        received.parsed.streams.length,
        "from",
        getDateString(new Date(received.time)),
      );
      setReceivedData(received);
      useKickStore.getState().actions.setChatrooms(received.chatrooms);

      return received;
    },
  );

  useEffect(() => {
    useKickStore.getState().actions.setChatrooms(_receivedData.chatrooms);
  }, [_receivedData.chatrooms]);

  useEffect(() => {
    const { clear } = shiftableInterval(() => {
      hydrateStreamsHandler().catch(console.error);
    }, NOPIXEL_DATA_INTERVAL);

    return () => clear();
  }, [hydrateStreamsHandler]);

  return (
    <NopixelBar receivedData={receivedData} timeFormatted={timeFormatted} />
  );
}

export const NopixelBarWithData = memo(NopixelBarWithDataComponent);
