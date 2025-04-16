"use client";

import { useCallback, useRef } from "react";
import { useMainStore } from "../../stores/mainStore";
import { usePersistStore } from "../../stores/persistStore";
import { clamp } from "../../utils/math";

const MIN_WIDTH = 200; // Define a minimum chat width
const MAX_WIDTH = 800; // Define a maximum chat width

export function HorizontalResizer({ width }: { width: number }) {
  const setChatWidth = usePersistStore((state) => state.actions.setChatWidth);
  const setIsChatResizing = useMainStore(
    (state) => state.actions.setIsChatResizing,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const animationFrameId = useRef<number | null>(null);
  const latestWidth = useRef<number>(width);

  const updateWidth = useCallback(() => {
    setChatWidth(latestWidth.current);
    animationFrameId.current = null;
  }, [setChatWidth]);

  const handlePointerDown = useCallback(
    (downEvent: React.PointerEvent<HTMLDivElement>) => {
      if (isDragging.current) return;
      isDragging.current = true;

      const target = downEvent.currentTarget;
      target.setPointerCapture(downEvent.pointerId);
      setIsChatResizing(true);

      startX.current = downEvent.clientX;
      startWidth.current = width;
      latestWidth.current = width;

      document.body.style.cursor = "ew-resize";
      downEvent.preventDefault();
    },
    [width, setIsChatResizing],
  );

  const handlePointerMove = useCallback(
    (moveEvent: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging.current) return;
      moveEvent.preventDefault();

      const currentX = moveEvent.clientX;
      const deltaX = currentX - startX.current;

      // Width decreases as deltaX becomes negative (moving left)
      const newWidth = clamp(startWidth.current - deltaX, MIN_WIDTH, MAX_WIDTH);

      latestWidth.current = newWidth;

      if (animationFrameId.current === null) {
        animationFrameId.current = requestAnimationFrame(updateWidth);
      }
    },
    [updateWidth],
  );

  const handlePointerUp = useCallback(
    (upEvent: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      setIsChatResizing(false);

      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }

      setChatWidth(latestWidth.current);

      const target = upEvent.currentTarget;
      target.releasePointerCapture(upEvent.pointerId);

      document.body.style.cursor = "";
    },
    [setIsChatResizing, updateWidth, setChatWidth],
  );

  return (
    <div
      ref={containerRef}
      className="absolute left-0 top-0 z-10 h-full w-1 cursor-ew-resize touch-none bg-transparent px-[4px] hover:bg-blue-500/50"
      style={{ transform: "translateX(-50%)" }} // Center the grab handle on the edge
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="separator"
      aria-valuenow={width}
      aria-valuemin={MIN_WIDTH}
      aria-valuemax={MAX_WIDTH}
      aria-controls="chat-container" // Assuming the parent container will have this ID
      aria-label="Resize chat panel"
    />
  );
}
