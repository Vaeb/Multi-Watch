"use client";

import Image from "next/image";
import { memo, useEffect, useState } from "react";
import { addStream } from "../utils/addStream";
import { useMainStore } from "../stores/mainStore";

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

interface RemoteLive {
  streams: RemoteStream[];
  streamerData: Record<string, Partial<RemoteStream>>;
  tick: number;
  factionCount: Record<string, number>;
  npFactions: Record<string, number>;
  filterFactions: [string, string, boolean, number][];
  useColorsDark: Record<string, string>;
}

interface NopixelBarButtonProps {
  imageUrl: string;
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

const NopixelBarButton = ({
  imageUrl,
  alt,
  onClick,
}: NopixelBarButtonProps) => {
  return (
    <div className="mb-2 flex h-[42px] items-center justify-center">
      <button
        className="h-[42px] opacity-40 hover:opacity-100"
        onClick={onClick}
      >
        <Image src={imageUrl} width={42} height={42} alt={alt} />
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
      >
        <Image
          className="rounded-full"
          src={imageUrl}
          width={42}
          height={42}
          alt={channel}
        />
      </button>
    </div>
  );
};

const getData = async () => {
  const dataRaw = await fetch("https://vaeb.io:3030/live");
  const data = await dataRaw.json();
  console.log("[getData]", Object.keys(data));
  return data as RemoteLive;
};

function NopixelBarComponent() {
  const [data, setData] = useState<RemoteLive | null>(null);
  const { toggleNopixel } = useMainStore.getState().actions;
  const { streams, useColorsDark } = data || {};

  useEffect(() => {
    getData()
      .then((_data) => {
        setData(_data);
      })
      .catch((err) => console.log(err));
    const timer = setInterval(
      () => {
        getData()
          .then((_data) => {
            setData(_data);
          })
          .catch((err) => console.log(err));
      },
      1000 * 60 * 5,
    );
    return () => clearInterval(timer);
  }, []);

  // 18+(42+12)*15-12
  // 816px
  return (
    <div className="no-scrollbar absolute z-10 flex h-[63%] max-h-[90vh] w-[60px] flex-col gap-3 overflow-y-auto py-[9px]">
      <NopixelBarButton
        imageUrl="/x1.png"
        alt="Update streams"
        onClick={toggleNopixel}
      />
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
