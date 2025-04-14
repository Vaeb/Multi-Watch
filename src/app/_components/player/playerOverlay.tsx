"use client";

import { memo, useCallback } from "react";
import { type PlayerProps } from "./videoClient";
import { useMainStore } from "../../stores/mainStore";
import Image from "next/image";
import { useKickStore } from "../../stores/kickStore";
import { removeStream } from "../../utils/removeStream";
import WhiteXIcon from "../icons/whiteXIcon";
import WhiteSpeakerIcon from "../icons/whiteSpeakerIcon";
import WhiteChatIcon from "../icons/whiteChatIcon";
import { log } from "../../utils/log";

interface PlayerOverlayProps extends PlayerProps {}

function PlayerOverlayComponent({ channel, type }: PlayerOverlayProps) {
  const audioClick = useCallback(() => {
    const { streams, streamPlayer, actions } = useMainStore.getState();
    log("[PlayerOverlay]", streamPlayer);
    for (const stream of streams) {
      const player = streamPlayer[stream.value];
      const mute = stream.value !== channel;
      if (player && "setMuted" in player) {
        player.setMuted(mute);
      }
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

  const focusClick = useCallback(() => {
    const { streams, streamPositions, actions } = useMainStore.getState();

    // If already focused or only one stream, do nothing
    if (streamPositions[channel] === 0 || streams.length <= 1) {
      return;
    }

    // Create new positions map
    const newStreamPositions: Record<string, number> = {};
    newStreamPositions[channel] = 0; // Make the clicked channel focused

    // Get other channels sorted by their current position
    const otherChannels = streams
      .map((s) => s.value)
      .filter((c) => c !== channel)
      .sort((a, b) => (streamPositions[a] ?? 0) - (streamPositions[b] ?? 0));

    // Assign positions 1, 2, ... to the other channels
    otherChannels.forEach((otherChannel, index) => {
      newStreamPositions[otherChannel] = index + 1;
    });

    // Update the store (this also updates URL via streamsToPath inside setStreams)
    actions.setStreams(streams, newStreamPositions);
  }, [channel]);

  // Check if the current stream is focused or the only stream
  const isFocused = useMainStore(
    (state) =>
      state.streams.length <= 1 || state.streamPositions[channel] === 0,
  );
  // Check the current view mode
  const viewMode = useMainStore((state) => state.viewMode);

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
          {viewMode === "focused" && !isFocused ? (
            <button onClick={focusClick} className="">
              <Image
                src="/up1.svg"
                className="rotate-180"
                width={21}
                height={21}
                alt="Focus Stream"
              />
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
