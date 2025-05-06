"use client";

import { memo, useCallback, useState } from "react";
import { type PlayerProps } from "./videoClient";
import { useMainStore } from "../../stores/mainStore";
import { useKickStore } from "../../stores/kickStore";
import { removeStream } from "../../utils/removeStream";
import WhiteXIcon from "../icons/whiteXIcon";
import WhiteSpeakerIcon from "../icons/whiteSpeakerIcon";
import WhiteChatIcon from "../icons/whiteChatIcon";
import { log } from "../../utils/log";
import { useShallow } from "zustand/shallow";
import ArrowIcon from "../icons/arrowIcon";
import RefreshIcon from "../icons/refreshIcon";
import clsx from "clsx";
import { useDrag } from "./dragContext";
import { useStableCallback } from "~/app/hooks/useStableCallback";

interface PlayerOverlayProps extends PlayerProps {}

function PlayerOverlayComponent({ channel, type }: PlayerOverlayProps) {
  const [tipText, setTipText] = useState("Tip: Drag streams to reorder.");
  const defaultTipText = "Tip: Drag streams to reorder.";

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

  // Get necessary state directly from mainStore for rendering logic
  const {
    streamCount,
    currentPosition,
    viewFocused,
    streamFocused,
    isDragging,
    dragChannel,
  } = useMainStore(
    useShallow((state) => ({
      streamCount: state.streams.length,
      currentPosition: state.streamPositions[channel],
      viewFocused: state.viewMode === "focused",
      streamFocused:
        state.streams.length <= 1 || state.streamPositions[channel] === 0,
      isDragging: state.isDragging,
      dragChannel: state.dragChannel,
    })),
  );

  const { onMouseDownDrag } = useDrag();

  const onMouseDown = useStableCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }
    e.preventDefault();
    onMouseDownDrag(channel, e);
  });

  const isDraggingThis = isDragging && dragChannel === channel;

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

  // Handler for double-click to go fullscreen
  const onDoubleClick = useStableCallback((e: React.MouseEvent) => {
    // Don't trigger if clicking on buttons
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    useMainStore.getState().actions.forcePlayerFullscreen(channel);
  });

  return (
    <div
      className={clsx(
        "group absolute z-[9999] flex min-h-[40%] w-full items-start justify-center bg-white/0 pt-8",
        // "active:cursor-grabbing active:bg-white/5",
        isDraggingThis ? "cursor-grabbing" : "cursor-grab",
      )}
      style={{
        clipPath: "inset(0 0 -9999px 20%)",
      }}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
    >
      <div className="flex min-w-48 flex-col items-center justify-center rounded-md bg-black/0 px-4 pb-2 pt-1 transition duration-100 ease-out group-hover:bg-black/50">
        {/* New wrapper for opacity control */}
        <div className="flex flex-col items-center opacity-0 transition-opacity duration-100 group-hover:opacity-80">
          {/* Channel Name */}
          <div className="mb-1 text-center text-sm font-medium text-white">
            {channel}
          </div>
          {/* New Hint Text */}
          <div className="relative mb-2 h-4 w-full text-center text-xs text-gray-300/95">
            <p className="absolute inset-0 flex w-full items-center justify-center whitespace-nowrap p-0">
              {tipText}
            </p>
          </div>
          {/* Buttons Container */}
          <div className="flex items-center justify-center gap-x-3 gap-y-2">
            <button
              onClick={chatClick}
              onMouseEnter={() => setTipText("Press to view chat.")}
              onMouseLeave={() => setTipText(defaultTipText)}
            >
              <WhiteChatIcon size={28} />
            </button>
            {type === "twitch" ? (
              <button
                onClick={audioClick}
                onMouseEnter={() => setTipText("Press to select audio.")}
                onMouseLeave={() => setTipText(defaultTipText)}
              >
                <WhiteSpeakerIcon size={28} />
              </button>
            ) : null}
            {/* {canMoveLeft ? (
              <button onClick={moveLeft} title="Move Left">
                <ArrowIcon size={21} className="rotate-90" alt="Move Right" />
              </button>
            ) : null} */}
            {viewFocused && !streamFocused ? (
              <button
                onClick={focusClick}
                className=""
                title="Focus Stream"
                onMouseEnter={() => setTipText("Press to focus stream.")}
                onMouseLeave={() => setTipText(defaultTipText)}
              >
                <ArrowIcon size={21} className="rotate-180" alt="Move Right" />
              </button>
            ) : null}
            {/* {canMoveRight ? (
              <button onClick={moveRight} title="Move Right">
                <ArrowIcon size={21} className="-rotate-90" alt="Move Right" />
              </button>
            ) : null} */}
            <button
              onClick={reloadStream}
              onMouseEnter={() => setTipText("Press to reload stream.")}
              onMouseLeave={() => setTipText(defaultTipText)}
            >
              <RefreshIcon size={21} alt="Reload" />
            </button>
            <button
              onClick={closeStream}
              onMouseEnter={() => setTipText("Press to close stream.")}
              onMouseLeave={() => setTipText(defaultTipText)}
            >
              <WhiteXIcon size={28} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const PlayerOverlay = memo(PlayerOverlayComponent);
