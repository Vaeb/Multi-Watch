"use client";

import Image from "next/image";
import { memo } from "react";
import { addStream } from "../utils/addStream";
import { type MainState, useMainStore } from "../stores/mainStore";
import WhiteXIcon from "./icons/whiteXIcon";

export interface RemoteStream {
  channelName: string;
  title: string;
  viewers: number;
  profileUrl: string;
  rpServer: string;
  characterName: string;
  nicknameLookup: string;
  faction: string;
  tagFaction: string;
  tagText: string;
  factions: string[];
  factionsMap: Record<string, boolean>;
  noOthersInclude: boolean;
  noPublicInclude: boolean;
  noInternationalInclude: boolean;
  wlOverride: boolean;
  facebook: boolean;
}

export interface RemoteParsed {
  streams: RemoteStream[];
  useColorsDark: Record<string, string>;
}

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

function NopixelBarComponent({ parsedData }: { parsedData: RemoteParsed }) {
  const nopixelShown = useMainStore(selector2);

  const { streams, useColorsDark } = parsedData;
  const { toggleNopixel } = useMainStore.getState().actions;

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
