"use client";

import Image from "next/image";
import { memo, useEffect, useState } from "react";
import { addStream } from "../utils/addStream";
import { type MainState, useMainStore } from "../stores/mainStore";
import WhiteXIcon from "./icons/whiteXIcon";
import { type RemoteReceived } from "../../types";
import { hydrateNopixelData } from "../actions/hydrateNopixelData";
import { log } from "../utils/log";
import { NOPIXEL_DATA_INTERVAL } from "../constants";

interface NopixelBarButtonProps {
  alt: string;
  onClick: (...args: any[]) => any;
}

interface NopixelBarTextProps {
  message: string;
  shortMessage: string;
  shortWrap?: boolean;
}

interface StreamIconProps {
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
}: NopixelBarTextProps) => {
  return (
    <div className="flex items-center justify-center">
      <div className="ml-[6px] flex text-left text-sm">
        <p
          className={`${shortWrap ? "break-word" : "whitespace-nowrap"} absolute opacity-65 group-hover:opacity-0`}
        >
          {shortMessage}
        </p>
        <p className="break-keep opacity-0 group-hover:opacity-100">
          {message}
        </p>
      </div>
    </div>
  );
};

const StreamIcon = ({
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
            <p className="text-xs text-red-500 opacity-70 group-hover/stream:opacity-100">
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
}: {
  receivedData: RemoteReceived;
}) {
  const nopixelShown = useMainStore(selector2);
  const { toggleNopixel } = useMainStore.getState().actions;

  const [receivedData, setReceivedData] = useState(_receivedData);

  const { parsed, time } = receivedData;
  const { streams, useColorsDark } = parsed;

  const timeFormatted = new Date(time).toLocaleString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      hydrateNopixelData()
        .then((received) => {
          log(
            "Hydrating NoPixel stream data:",
            received.parsed.streams.length,
            "from",
            new Date(received.time),
          );
          setReceivedData(received);
        })
        .catch(console.error);
    }, NOPIXEL_DATA_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // 18+(42+12)*15-12
  // 816px
  return (
    <div
      className={`${nopixelShown ? "" : "invisible absolute"} flex h-[100vh] w-full flex-col items-start gap-0 py-[9px]`}
    >
      <NopixelBarButton alt="Update streams" onClick={toggleNopixel} />
      <div className="no-scrollbar flex flex-col items-start gap-3 overflow-y-auto pt-3">
        <NopixelBarText
          message={`⦿ ${streams?.length ?? 0} streams live`}
          shortMessage={`⦿ ${streams?.length ?? 0}`}
          shortWrap={false}
        />
        <NopixelBarText
          message={`Last refreshed streams at ${timeFormatted}`}
          shortMessage={`${timeFormatted}`}
          shortWrap={true}
        />
        {streams?.map((stream) => (
          <StreamIcon
            key={stream.channelName}
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
              addStream(stream.channelName);
            }}
          />
        ))}
      </div>
    </div>
  );
}

export const NopixelBar = memo(NopixelBarComponent);
