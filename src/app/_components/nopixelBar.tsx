"use client";

import Image from "next/image";
import { memo } from "react";
import { addStream } from "../utils/addStream";
import { MainState, useMainStore } from "../stores/mainStore";
import WhiteXIcon from "./icons/whiteXIcon";

interface RemoteStream {
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

export interface RemoteLive {
  streams: RemoteStream[];
  streamerData: Record<string, Partial<RemoteStream>>;
  tick: number;
  factionCount: Record<string, number>;
  npFactions: Record<string, number>;
  filterFactions: [string, string, boolean, number][];
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
  rpServer: string;
  char: string;
  color: string;
  onClick?: (...args: any[]) => any;
}

const NopixelBarButton = ({ alt, onClick }: NopixelBarButtonProps) => {
  return (
    <div className="flex h-0 items-center justify-center">
      <button
        className="absolute top-[9px] h-[42px] opacity-40 hover:opacity-100"
        onClick={onClick}
        aria-label={alt}
      >
        <WhiteXIcon size={42} />
      </button>
    </div>
  );
};

const StreamIcon = ({
  channel,
  imageUrl,
  viewers,
  rpServer,
  char,
  color,
  onClick,
}: StreamIconProps) => {
  return (
    <div className="flex h-[60px] items-center justify-center">
      <button
        className="h-[42px] opacity-100 hover:opacity-100"
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
      </button>
    </div>
  );
};

const selector2 = (state: MainState) => state.nopixelShown;

function NopixelBarComponent({ data }: { data: RemoteLive }) {
  const nopixelShown = useMainStore(selector2);

  const { streams, useColorsDark } = data || {};
  const { toggleNopixel } = useMainStore.getState().actions;

  // 18+(42+12)*15-12
  // 816px
  return (
    <div
      className={`${nopixelShown ? "" : "invisible"} no-scrollbar h-full w-full flex-col gap-3 overflow-y-auto pt-[59px]`}
    >
      <NopixelBarButton alt="Update streams" onClick={toggleNopixel} />
      {streams?.map((stream) => (
        <StreamIcon
          key={stream.channelName}
          channel={stream.channelName}
          imageUrl={stream.profileUrl}
          viewers={stream.viewers}
          rpServer={stream.rpServer}
          char={stream.tagText}
          color={useColorsDark?.[stream.faction] ?? "#FFF"}
          onClick={() => {
            addStream(stream.channelName);
          }}
        />
      ))}
    </div>
  );
}

export const NopixelBar = memo(NopixelBarComponent);
