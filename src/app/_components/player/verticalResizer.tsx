"use client";

import { memo, useCallback, useRef } from "react";
import { useMainStore } from "../../stores/mainStore";
import { usePersistStore } from "../../stores/persistStore";
import { clamp } from "../../utils/math";
import { layoutCellsFocused } from "~/app/utils/layoutCells";
import { useStableCallback } from "~/app/hooks/useStableCallback";

const MIN_HEIGHT = 10;
const MAX_HEIGHT = 90;

interface VerticalResizerProps {
  top: number;
  containerWidth: number;
  containerHeight: number;
}

function VerticalResizerComponent({
  top,
  containerWidth,
  containerHeight,
}: VerticalResizerProps) {
  const setFocusHeight = usePersistStore(
    (state) => state.actions.setFocusHeight,
  );
  const setIsResizing = useMainStore((state) => state.actions.setIsResizing);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const animationFrameId = useRef<number | null>(null); // Ref for RAF ID
  const latestHeight = useRef<number>(top); // Ref to store latest calculated height

  // Function to update state within RAF
  const updateHeight = useCallback(() => {
    setFocusHeight(latestHeight.current);
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
        MIN_HEIGHT,
        MAX_HEIGHT,
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
    [setIsResizing, updateHeight, setFocusHeight], // Dependency correct
  );

  const handleDoubleClick = useStableCallback(() => {
    const { streamsOrdered, viewMode } = useMainStore.getState();

    if (!containerHeight || viewMode !== "focused") return;

    const smallCellHeight = Number.parseFloat(
      layoutCellsFocused(
        streamsOrdered.length,
        containerWidth,
        containerHeight,
        0,
      )[1]?.height ?? "-1",
    );

    if (smallCellHeight < 0) return;

    isDragging.current = false;

    const autoFocusHeightPx = containerHeight - smallCellHeight;
    const autoFocusHeightVh = clamp(
      (autoFocusHeightPx / containerHeight) * 100,
      MIN_HEIGHT,
      MAX_HEIGHT,
    );

    // Update latestHeight ref and call setFocusHeight directly
    // This avoids potential race conditions with RAF if the user clicks fast
    latestHeight.current = autoFocusHeightVh;
    setFocusHeight(autoFocusHeightVh);
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
      aria-valuemin={MIN_HEIGHT}
      aria-valuemax={MAX_HEIGHT}
      aria-label="Resize focused player"
    />
  );
}

export const VerticalResizer = memo(VerticalResizerComponent);
