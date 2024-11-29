"use client";

import { memo, useCallback } from "react";
import { type PlayerProps } from "./video";
import { useMainStore } from "../stores/mainStore";
import Image from "next/image";

interface PlayerOverlayProps extends PlayerProps {}

function PlayerOverlayComponent({
  children,
  channel,
}: PlayerOverlayProps) {
  const audioClick = useCallback(() => {
    const { streams, streamPlayer, actions } = useMainStore.getState();
    console.log(11, streamPlayer);
    for (const stream of streams) {
      const player = streamPlayer[stream.value];
      console.log(22, stream.value);
      const mute = stream.value !== channel;
      player?.setMuted(mute);
      actions.setManuallyMuted(
        stream.value,
        mute,
        // (mute ? +new Date() : 0) as unknown as boolean,
      );
    }
  }, [channel]);

  const chatClick = useCallback(() => {
    useMainStore.getState().actions.setSelectedChat(channel);
  }, [channel]);

  return (
    <div className="group absolute h-[110px] w-full">
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center justify-center rounded-md bg-black/0 transition duration-100 ease-out group-hover:bg-black/50">
          <div className="flex gap-4 p-4 opacity-0 group-hover:opacity-80">
            <button onClick={audioClick}>
              <Image
                src="/speaker1.png"
                width={28}
                height={28}
                alt="Select audio"
              />
            </button>
            <button onClick={chatClick}>
              <Image src="/chat3.png" width={28} height={28} alt="View chat" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const PlayerOverlay = memo(PlayerOverlayComponent);
