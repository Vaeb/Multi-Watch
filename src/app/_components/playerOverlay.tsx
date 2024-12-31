"use client";

import { memo, useCallback } from "react";
import { type PlayerProps } from "./video";
import { useMainStore } from "../stores/mainStore";
import Image from "next/image";
import { useKickStore } from "../stores/kickStore";
import { removeStream } from "../utils/removeStream";
import WhiteXIcon from "./icons/whiteXIcon";
import WhiteSpeakerIcon from "./icons/whiteSpeakerIcon";
import WhiteChatIcon from "./icons/whiteChatIcon";

interface PlayerOverlayProps extends PlayerProps {}

function PlayerOverlayComponent({ channel, type }: PlayerOverlayProps) {
  const audioClick = useCallback(() => {
    const { streams, streamPlayer, actions } = useMainStore.getState();
    for (const stream of streams) {
      const player = streamPlayer[stream.value];
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
    useMainStore.getState().actions.setChat(true);
    useKickStore.getState().chatMethods[channel]?.scrollToBottom();
  }, [channel]);

  const reloadStream = useCallback(() => {
    useMainStore.getState().streamPlayer[channel]?.setChannel(channel);
  }, [channel]);

  const closeStream = useCallback(() => {
    removeStream(channel, type ?? "twitch");
  }, [channel, type]);

  return (
    <div className="group absolute mt-8 flex h-[35%] w-[50%] items-start justify-center">
      <div className="flex items-center justify-center rounded-md bg-black/0 transition duration-100 ease-out group-hover:bg-black/50">
        <div className="flex gap-4 p-4 opacity-0 group-hover:opacity-80">
          <button onClick={chatClick}>
            <WhiteChatIcon size={28} />
          </button>
          {type === "twitch" ? (
            <button onClick={audioClick}>
              <WhiteSpeakerIcon size={28} />
            </button>
          ) : null}
          <button onClick={reloadStream}>
            <Image
              src="/refresh2.svg"
              className=""
              width={21}
              height={21}
              alt="Reload"
            />
          </button>
          <button onClick={closeStream}>
            <WhiteXIcon size={28} />
          </button>
        </div>
      </div>
    </div>
  );
}

export const PlayerOverlay = memo(PlayerOverlayComponent);
