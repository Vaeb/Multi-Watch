"use client";

import { memo, useRef } from "react";
import { PlayerOverlay } from "./playerOverlay";
import { type Platform } from "~/types";
import { log } from "../../utils/log";
import { useMainStore } from "../../stores/mainStore";
import clsx from "clsx";
import { DragHandle } from "./dragHandle";
import React from "react";
import { type Rect } from "~/app/utils/layoutCells";
import { areEqualObj } from "~/app/utils/areEqualObj";
import { Player } from "./videoClient";
import { useShallow } from "zustand/shallow";

interface PlayerWrapperProps {
  channel: string;
  type: Platform;
  cell: Rect | undefined;
}

const mainStoreSelector = (
  state: ReturnType<typeof useMainStore.getState>,
  channel: string,
) => {
  const isDraggingThis = state.isDragging && state.dragChannel === channel;
  return {
    isResizing: state.isResizing,
    isDragging: state.isDragging,
    isDraggingThis,
    isPotentialDropTarget: state.isDragging && !isDraggingThis,
    isHovered: state.hoveredChannel === channel,
    dragStartX: isDraggingThis ? state.dragStartX : 0,
    dragStartY: isDraggingThis ? state.dragStartY : 0,
    dragCurrentX: isDraggingThis ? state.dragCurrentX : 0,
    dragCurrentY: isDraggingThis ? state.dragCurrentY : 0,
  };
};

function PlayerWrapperComponent({ channel, type, cell }: PlayerWrapperProps) {
  const {
    isResizing,
    isDragging,
    isDraggingThis,
    isPotentialDropTarget,
    isHovered,
    dragStartX,
    dragStartY,
    dragCurrentX,
    dragCurrentY,
  } = useMainStore(useShallow((state) => mainStoreSelector(state, channel)));

  const wrapperRef = useRef<HTMLDivElement>(null);

  if (!cell) return null;
  const { height, width, y: top, x: left } = cell;

  const dragOffsetX = isDraggingThis ? dragCurrentX - dragStartX : 0;
  const dragOffsetY = isDraggingThis ? dragCurrentY - dragStartY : 0;

  log(`[PlayerWrapper] Re-rendered ${channel}:`, height, width, top, left);

  return (
    <div
      ref={wrapperRef}
      data-player-wrapper={channel}
      className={clsx(
        "absolute flex flex-col items-center",
        !isResizing && !isDragging && "duration-50 transition ease-linear",
        isDraggingThis &&
          "z-50 before:absolute before:inset-0 before:bg-blue-500/5 before:content-['']",
        isPotentialDropTarget && "z-40",
        isHovered &&
          "outline outline-[3px] outline-offset-[-3px] outline-blue-500/70",
        "h-[var(--height)] w-[var(--width)] translate-x-[var(--left)] translate-y-[var(--top)]",
      )}
      style={
        {
          "--height": height,
          "--width": width,
          "--top": top,
          "--left": left,
          ...(isDraggingThis
            ? {
                transform: `translate(calc(var(--left) + ${dragOffsetX}px), calc(var(--top) + ${dragOffsetY}px))`,
              }
            : {}),
        } as React.CSSProperties
      }
    >
      <PlayerOverlay channel={channel} type={type} />
      <Player type={type} channel={channel} />
      <DragHandle channel={channel} />
    </div>
  );
}

export const PlayerWrapper = memo(PlayerWrapperComponent, areEqualObj("cell"));
