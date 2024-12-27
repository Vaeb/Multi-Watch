"use client";

import Image from "next/image";
import { memo, useCallback, useEffect, useState } from "react";
import { addStream } from "../utils/addStream";
import { type MainState, useMainStore } from "../stores/mainStore";
import WhiteXIcon from "./icons/whiteXIcon";
import { type Platform, type RemoteReceived } from "../../types";
import { hydrateStreams } from "../actions/hydrateStreams";
import { getDateString, log } from "../utils/log";
import { NOPIXEL_DATA_INTERVAL } from "../constants";
import { shiftableInterval } from "../utils/shiftableInterval";
import { randomInt } from "../utils/randomInt";
import { type KickState } from "../stores/kickStore";
import { fetchKickLive } from "../utils/fetchKickLive";
import { updateServerKickLive } from "../actions/updateServerKickLive";

interface NopixelBarButtonProps {
  alt: string;
  onClick: (...args: any[]) => any;
}

interface NopixelBarTextProps {
  message: string;
  shortMessage: string;
  shortWrap?: boolean;
  maxLines?: number;
}

interface StreamIconProps {
  platform: Platform;
  channel: string;
  imageUrl: string;
  viewers: number;
  char: string;
  color: string;
  onClick?: (...args: any[]) => any;
}

const NopixelBarButton = ({ alt, onClick }: NopixelBarButtonProps) => {
  return (
    <div className="mb-2 flex h-[42px] items-center justify-center">
      <button
        className="group/np flex h-[42px] items-center gap-3"
        onClick={onClick}
        aria-label={alt}
      >
        <div className="h-[42px] w-[42px] opacity-40 group-hover/np:opacity-100">
          <WhiteXIcon size={42} />
        </div>
        <p>Close</p>
      </button>
    </div>
  );
};

const NopixelBarText = ({
  message,
  shortMessage,
  shortWrap,
  maxLines = 1,
}: NopixelBarTextProps) => {
  return (
    <div className="relative flex w-full flex-col items-center justify-center">
      <div className="ml-[6px] flex w-full text-left text-sm">
        <p
          className={`${shortWrap ? "break-word whitespace-pre-line" : "whitespace-nowrap"} absolute opacity-65 group-hover:opacity-0`}
        >
          {shortMessage}
        </p>
        <p className="absolute whitespace-pre-line break-keep opacity-0 group-hover:opacity-100">
          {message}
        </p>
        <p className="whitespace-pre-line break-keep opacity-0">
          {"\n".repeat(maxLines)}
        </p>
      </div>
    </div>
  );
};

const StreamIcon = ({
  platform,
  channel,
  imageUrl,
  viewers,
  char,
  color,
  onClick,
}: StreamIconProps) => {
  return (
    <div className="flex h-[60px] items-center justify-center">
      <button
        className="group/stream flex h-[42px] items-center gap-2 opacity-50 group-hover:opacity-100"
        style={{ color }}
        onClick={onClick}
        aria-label={channel}
      >
        <Image
          className="h-[42px] rounded-full"
          src={imageUrl}
          width={42}
          height={42}
          aria-label={channel}
          alt={channel}
        />
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-2">
            <p>{channel}</p>
            <p
              className={`text-xs ${platform === "twitch" ? "text-red-500" : "text-green-500"} opacity-70 group-hover/stream:opacity-100`}
            >
              ⦿{" "}
              {viewers < 1000
                ? viewers
                : `${parseFloat((viewers / 1e3).toFixed(1))}K`}
            </p>
          </div>
          <p className="text-xs">{char}</p>
        </div>
      </button>
    </div>
  );
};

const selector2 = (state: MainState) => state.nopixelShown;

function NopixelBarComponent({
  receivedData: _receivedData,
  chatrooms,
}: {
  receivedData: RemoteReceived;
  chatrooms: KickState["chatrooms"];
}) {
  const nopixelShown = useMainStore(selector2);
  const { toggleNopixel } = useMainStore.getState().actions;

  const [receivedData, setReceivedData] = useState(_receivedData);
  const [hydrateTime, setHydrateTime] = useState(+new Date());

  const { parsed } = receivedData;
  const { streams, useColorsDark } = parsed;

  const timeFormatted = new Date(hydrateTime)
    .toLocaleString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    })
    .replace(" ", "\n");

  const hydrateStreamsHandler = useCallback(async () => {
    const hydrateTime = +new Date();
    const received = await hydrateStreams();
    log(
      "[NopixelBar] Hydrating streams from server:",
      received.parsed.streams.length,
      "from",
      getDateString(new Date(received.time)),
    );
    setReceivedData(received);
    setHydrateTime(hydrateTime);
    return received;
  }, []);

  const updateLiveKickStreams = useCallback(async () => {
    log("[NopixelBar] Needs kick live streams...");
    const kickStreams = await fetchKickLive(chatrooms);
    await updateServerKickLive(kickStreams);
    log(
      "[NopixelBar] Updated server kick streams",
      kickStreams.map((stream) => `${stream.channelName} ${stream.viewers}`),
    );
    hydrateStreamsHandler().catch(console.error);
  }, [hydrateStreamsHandler, chatrooms]);

  useEffect(() => {
    // resolves also 'needs kick live data', aka has it been >5 minutes since server received live data
    // if so, lookup data & send in server action to server
    // then shift interval by random amount from NOPIXEL_DATA_INTERVAL*0.25 to NOPIXEL_DATA_INTERVAL*0.75
    const { clear, shiftOnce } = shiftableInterval(() => {
      hydrateStreamsHandler()
        .then((received) => {
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
      updateLiveKickStreams().catch(console.error);
    }

    return () => clear();
  }, [
    hydrateStreamsHandler,
    updateLiveKickStreams,
    _receivedData.needsKickLiveStreams,
  ]);

  // 18+(42+12)*15-12
  // 816px
  return (
    <div
      className={`${nopixelShown ? "" : "invisible absolute"} flex h-[100vh] w-full flex-col items-start gap-3`}
    >
      <NopixelBarText
        message={`⦿ ${streams?.length ?? 0} streams live`}
        shortMessage={`⦿ ${streams?.length ?? 0}`}
        shortWrap={false}
      />
      <NopixelBarText
        maxLines={2}
        message={`Last refreshed streams at ${timeFormatted}`}
        shortMessage={`${timeFormatted}`}
        shortWrap={true}
      />
      {streams?.map((stream) => (
        <StreamIcon
          key={stream.channelName}
          platform={stream.faction === "Kick" ? "kick" : "twitch"}
          channel={stream.channelName}
          imageUrl={stream.profileUrl}
          viewers={stream.viewers}
          char={stream.tagText
            .replace(/^\? *| *\?$|[《]/g, "")
            .replace("》", " ")
            .replace("〈", "《")
            .replace("〉", "》")
            .replace("Peacekeeper", "Deputy")
            .trim()}
          color={useColorsDark?.[stream.faction] ?? "#FFF"}
          onClick={() => {
            addStream(
              stream.channelName,
              stream.faction === "Kick" ? "kick" : "twitch",
            );
          }}
        />
      ))}
    </div>
  );
}

export const NopixelBar = memo(NopixelBarComponent);
