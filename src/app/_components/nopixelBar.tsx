"use client";

import Image from "next/image";
import { memo, useEffect, useState } from "react";
import { addStream } from "../utils/addStream";
import { type MainState, useMainStore } from "../stores/mainStore";
import WhiteXIcon from "./icons/whiteXIcon";
import { type RemoteParsed } from "../../types";
import { hydrateNopixelData } from "../actions/hydrateNopixelData";
import { log } from "../utils/log";

interface NopixelBarButtonProps {
  alt: string;
  onClick: (...args: any[]) => any;
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
        className="group flex h-[42px] items-center gap-3"
        onClick={onClick}
        aria-label={alt}
      >
        <div className="h-[42px] w-[42px] opacity-40 group-hover:opacity-100">
          <WhiteXIcon size={42} />
        </div>
        <p>Close</p>
      </button>
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
        className="flex h-[42px] items-center gap-2 opacity-100 hover:opacity-100"
        style={{ color }}
        onClick={onClick}
        aria-label={channel}
      >
        <Image
          className="rounded-full"
          src={imageUrl}
          width={42}
          height={42}
          aria-label={channel}
          alt={channel}
        />
        <div className="flex flex-col items-start">
          <div className="flex gap-2">
            <p>{channel}</p>
            <p className="text-sm text-red-500">{viewers}</p>
          </div>
          <p className="text-xs">{char}</p>
        </div>
      </button>
    </div>
  );
};

const selector2 = (state: MainState) => state.nopixelShown;

const NOPIXEL_DATA_INTERVAL = 1000 * 60 * 5;

function NopixelBarComponent({
  parsedData: _parsedData,
}: {
  parsedData: RemoteParsed;
}) {
  const nopixelShown = useMainStore(selector2);

  const [parsedData, setParsedData] = useState(_parsedData);

  const { streams, useColorsDark } = parsedData;
  const { toggleNopixel } = useMainStore.getState().actions;

  useEffect(() => {
    const interval = setInterval(() => {
      hydrateNopixelData()
        .then((data) => {
          log("Hydrating NoPixel stream data:", data);
          setParsedData(data);
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
        {streams?.map((stream) => (
          <StreamIcon
            key={stream.channelName}
            channel={stream.channelName}
            imageUrl={stream.profileUrl}
            viewers={stream.viewers}
            char={stream.tagText
              .replace(/^\? *| *\?$/g, "")
              .replace("Peacekeeper", "Deputy")}
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
