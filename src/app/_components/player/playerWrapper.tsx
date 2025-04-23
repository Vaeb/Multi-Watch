import { memo, useRef } from "react";
import { PlayerOverlay } from "./playerOverlay";
import { type Platform } from "~/types";
import { log } from "../../utils/log";
import { useMainStore } from "../../stores/mainStore";
import clsx from "clsx";
import { DragHandle } from "./dragHandle";
import React from "react";
import { type Rect } from "~/app/utils/layoutCellsTight";
import { areEqualObj } from "~/app/utils/areEqualObj";

interface PlayerWrapperProps {
  children: React.ReactNode;
  channel: string;
  type: Platform;
  cell: Rect | undefined;
}

function PlayerWrapperComponent({
  children,
  channel,
  type,
  cell,
}: PlayerWrapperProps) {
  const isResizing = useMainStore((state) => state.isResizing);
  const isDragging = useMainStore((state) => state.isDragging);
  const dragChannel = useMainStore((state) => state.dragChannel);
  const dragStartX = useMainStore((state) => state.dragStartX);
  const dragStartY = useMainStore((state) => state.dragStartY);
  const dragCurrentX = useMainStore((state) => state.dragCurrentX);
  const dragCurrentY = useMainStore((state) => state.dragCurrentY);

  const isDraggingThis = isDragging && dragChannel === channel;
  const isPotentialDropTarget = isDragging && !isDraggingThis;

  // Calculate if cursor is over this player (potential drop target)
  const [isHovered, setIsHovered] = React.useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null); // Ref to get the element directly

  React.useEffect(() => {
    // Only set up listener if this component is a potential drop target
    if (!isPotentialDropTarget) {
      setIsHovered(false); // Ensure hover state is reset
      return; // Exit if not a potential target
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        const hovered =
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom;
        setIsHovered(hovered);
      } else {
        setIsHovered(false);
      }
    };

    // Add listener when this component becomes a potential drop target
    window.addEventListener("mousemove", handleMouseMove);

    // Cleanup function to remove listener and cancel animation frame
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      setIsHovered(false); // Reset hover state on cleanup
    };
    // Dependencies: Only run when dragging starts/stops or the dragged item changes
  }, [isPotentialDropTarget, channel]); // Removed coordinate dependencies

  if (!cell) return null;
  const { height, width, y: top, x: left } = cell;

  // Calculate drag offset for moving the element during drag
  const dragOffsetX = isDraggingThis ? dragCurrentX - dragStartX : 0;
  const dragOffsetY = isDraggingThis ? dragCurrentY - dragStartY : 0;

  log(`[PlayerWrapper] Re-rendered ${channel}:`, height, width, top, left);

  return (
    <div
      ref={wrapperRef} // Assign ref here
      data-player-wrapper={channel}
      className={clsx(
        "absolute flex flex-col items-center",
        !isResizing && !isDragging && "duration-50 transition ease-linear",
        isDraggingThis &&
          "z-50 before:absolute before:inset-0 before:bg-blue-500/5 before:content-['']",
        isPotentialDropTarget && "z-40", // Use the new variable
        isHovered &&
          isPotentialDropTarget &&
          "outline outline-[3px] outline-offset-[-3px] outline-blue-500/70", // Replaced ring with outline
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
      <DragHandle channel={channel} />
      {children}
    </div>
  );
}

export const PlayerWrapper = memo(PlayerWrapperComponent, areEqualObj("cell"));
