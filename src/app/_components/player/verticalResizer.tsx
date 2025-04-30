"use client";

import { memo, useCallback, useRef } from "react";
import { useMainStore } from "../../stores/mainStore";
import { clamp } from "../../utils/math";
import { useStableCallback } from "~/app/hooks/useStableCallback";
import { MAX_FOCUS_HEIGHT, MIN_FOCUS_HEIGHT } from "~/app/constants";

interface VerticalResizerProps {
  top: number;
}

function VerticalResizerComponent({ top }: VerticalResizerProps) {
  const { setFocusHeight, setIsResizing } = useMainStore(
    (state) => state.actions,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const animationFrameId = useRef<number | null>(null); // Ref for RAF ID
  const latestHeight = useRef<number>(top); // Ref to store latest calculated height

  // Function to update state within RAF
  const updateHeight = useCallback(() => {
    setFocusHeight(latestHeight.current, false);
    animationFrameId.current = null; // Reset RAF ID
  }, [setFocusHeight]);

  const handlePointerDown = useCallback(
    (downEvent: React.PointerEvent<HTMLDivElement>) => {
      if (isDragging.current) return; // Prevent multiple captures
      isDragging.current = true;

      const target = downEvent.currentTarget;
      target.setPointerCapture(downEvent.pointerId); // Capture the pointer
      setIsResizing(true);

      startY.current = downEvent.clientY;
      startHeight.current = top;
      latestHeight.current = top; // Initialize latest height

      // Set cursor style on the body for visual feedback during drag
      document.body.style.cursor = "ns-resize";
      downEvent.preventDefault(); // Prevent text selection, etc.
    },
    [top, setIsResizing],
  );

  const handlePointerMove = useCallback(
    (moveEvent: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging.current) return;

      moveEvent.preventDefault(); // Prevent potential browser drag interference

      const currentY = moveEvent.clientY;
      const deltaY = currentY - startY.current;
      const containerHeight =
        containerRef.current?.parentElement?.clientHeight ?? window.innerHeight;
      const deltaPercent = (deltaY / containerHeight) * 100;
      const newHeight = clamp(
        startHeight.current + deltaPercent,
        MIN_FOCUS_HEIGHT,
        MAX_FOCUS_HEIGHT,
      );

      latestHeight.current = newHeight; // Store the latest height

      // Schedule update in the next animation frame if not already scheduled
      if (animationFrameId.current === null) {
        animationFrameId.current = requestAnimationFrame(updateHeight);
      }
    },
    [updateHeight], // Add updateHeight to dependencies
  );

  const handlePointerUp = useCallback(
    (upEvent: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      setIsResizing(false); // Set resizing state to false

      // Cancel any pending animation frame
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }

      // Ensure final height is set
      setFocusHeight(latestHeight.current);

      const target = upEvent.currentTarget;
      target.releasePointerCapture(upEvent.pointerId); // Release the pointer

      // Reset cursor style
      document.body.style.cursor = "";
    },
    [setIsResizing, updateHeight, setFocusHeight],
  );

  const handleDoubleClick = useStableCallback(() => {
    setFocusHeight(0, true);
    isDragging.current = false;
    // Cancel any pending animation frame from dragging, just in case
    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
  });

  // Use Pointer Events directly on the element
  return (
    <div
      ref={containerRef}
      className="absolute left-0 z-10 h-1 w-full cursor-ns-resize touch-none bg-transparent py-[6px] hover:bg-blue-500/50"
      style={{ top: `${top}vh`, transform: "translateY(-50%)" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp} // Handle cancellation (e.g., browser intervention)
      onDoubleClick={handleDoubleClick}
      role="separator"
      aria-valuenow={top}
      aria-valuemin={MIN_FOCUS_HEIGHT}
      aria-valuemax={MAX_FOCUS_HEIGHT}
      aria-label="Resize focused player"
    />
  );
}

export const VerticalResizer = memo(VerticalResizerComponent);
