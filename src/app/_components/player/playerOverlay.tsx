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
import { useShallow } from "zustand/shallow";

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
    const { streams, streamPositions, streamsOrdered, actions } =
      useMainStore.getState();
    const currentPosition = streamPositions[channel];

    // Ensure currentPosition is valid and the channel is not already focused
    if (
      typeof currentPosition !== "number" ||
      currentPosition === 0 ||
      streams.length <= 1
    ) {
      return;
    }

    // Find the channel currently at position 0
    const currentFocusedChannel = streamsOrdered[0]?.value;

    // Should always find a focused channel if length > 1 and currentPosition !== 0
    if (!currentFocusedChannel) {
      console.error("Could not find the currently focused channel.");
      return;
    }

    // Create the new positions map by swapping
    const newStreamPositions = { ...streamPositions };
    newStreamPositions[channel] = 0; // Clicked channel becomes focused
    newStreamPositions[currentFocusedChannel] = currentPosition; // Old focused channel takes clicked channel's position

    // Update the store
    actions.setStreamPositions(newStreamPositions);
  }, [channel]);

  const moveStream = useCallback(
    (direction: -1 | 1) => {
      const { streams, streamPositions, viewMode, actions } =
        useMainStore.getState();
      const currentPosition = streamPositions[channel];
      const streamCount = streams.length;

      // Ensure currentPosition is valid and move is possible
      if (typeof currentPosition !== "number" || streamCount <= 1) {
        return;
      }

      if (viewMode === "focused" && currentPosition === 0)
        direction = -direction as 1 | -1;
      let targetPosition = (currentPosition + direction) % streamCount;
      if (targetPosition < 0) targetPosition = streamCount + targetPosition;
      const channelToSwapWith = Object.entries(streamPositions).find(
        ([, pos]) => pos === targetPosition,
      )?.[0];

      if (!channelToSwapWith) return; // Should not happen if logic is correct

      const newStreamPositions = { ...streamPositions };
      newStreamPositions[channel] = targetPosition;
      newStreamPositions[channelToSwapWith] = currentPosition;

      actions.setStreamPositions(newStreamPositions);
    },
    [channel],
  );

  // Memoized versions for onClick handlers
  const moveLeft = useCallback(() => moveStream(-1), [moveStream]);
  const moveRight = useCallback(() => moveStream(1), [moveStream]);

  // Get stream count and position for move button logic
  const { streamCount, currentPosition, viewFocused, streamFocused } =
    useMainStore(
      useShallow((state) => ({
        streamCount: state.streams.length,
        currentPosition: state.streamPositions[channel], // Keep potential undefined here
        viewFocused: state.viewMode === "focused", // Check the current view mode is focused
        streamFocused:
          state.streams.length <= 1 || state.streamPositions[channel] === 0, // Check if the current stream is focused or the only stream
      })),
    );

  // Check if position is defined and valid for moving
  const canMoveLeft =
    typeof currentPosition === "number" &&
    streamCount > 1 &&
    (!viewFocused ||
      (currentPosition !== 0 && // personal pref: should have arrows on focused or not?
        (currentPosition > 1 || currentPosition === 0)));
  const canMoveRight =
    typeof currentPosition === "number" &&
    streamCount > 1 &&
    (!viewFocused ||
      (currentPosition !== 0 && // personal pref: should have arrows on focused or not?
        (currentPosition < streamCount - 1 || currentPosition === 0)));

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
          {canMoveLeft ? (
            <button onClick={moveLeft} title="Move Left">
              <Image
                src="/up1.svg"
                className="rotate-90" // Rotate arrow left
                width={21}
                height={21}
                alt="Move Left"
              />
            </button>
          ) : null}
          {viewFocused && !streamFocused ? (
            <button onClick={focusClick} className="" title="Focus Stream">
              <Image
                src="/up1.svg"
                className="rotate-180"
                width={21}
                height={21}
                alt="Focus Stream"
              />
            </button>
          ) : null}
          {canMoveRight ? (
            <button onClick={moveRight} title="Move Right">
              <Image
                src="/up1.svg"
                className="-rotate-90" // Rotate arrow right
                width={21}
                height={21}
                alt="Move Right"
              />
            </button>
          ) : null}
          <button onClick={reloadStream}>
            <Image
              src="/refresh3.svg"
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
