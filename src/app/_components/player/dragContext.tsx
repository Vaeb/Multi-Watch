"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { useMainStore } from "../../stores/mainStore";
import { useShallow } from "zustand/shallow";
import { useStableCallback } from "~/app/hooks/useStableCallback";

interface DragContextType {
  startDrag: (channel: string, x: number, y: number) => void;
}

const DragContext = createContext<DragContextType | undefined>(undefined);

export const useDrag = () => {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error("useDrag must be used within a DragProvider");
  }
  return context;
};

interface DragProviderProps {
  children: React.ReactNode;
}

// Selector for necessary state and actions from mainStore
const dragStoreSelector = (
  state: ReturnType<typeof useMainStore.getState>,
) => ({
  isDragging: state.isDragging,
  setDragState: state.actions.setDragState, // We'll add this action to mainStore
  setStreamPositions: state.actions.setStreamPositions,
});

export const DragProvider: React.FC<DragProviderProps> = ({ children }) => {
  const { isDragging, setDragState, setStreamPositions } = useMainStore(
    useShallow(dragStoreSelector),
  );

  const dragChannelRef = useRef<string | null>(null); // Ref to track current drag channel

  // --- Internal Drag Logic ---

  // Function to update coordinates in the store
  const updateDrag = useStableCallback((x: number, y: number) => {
    setDragState({
      dragCurrentX: x,
      dragCurrentY: y,
    });
  });

  // Function to handle drag end logic
  const endDrag = useStableCallback(() => {
    if (!dragChannelRef.current) return;

    // Read necessary state directly via getState() inside the handler
    // to avoid stale closures if streamPositions change during drag
    const latestStreamPositions = useMainStore.getState().streamPositions;
    const latestDragCurrentX = useMainStore.getState().dragCurrentX;
    const latestDragCurrentY = useMainStore.getState().dragCurrentY;
    const currentDragChannel = dragChannelRef.current; // Get channel from ref

    if (
      currentDragChannel &&
      latestStreamPositions[currentDragChannel] !== undefined
    ) {
      const players = document.querySelectorAll("[data-player-wrapper]");
      const draggedPos = latestStreamPositions[currentDragChannel];
      let targetChannel: string | null = null;
      let targetPos = -1;

      players.forEach((player) => {
        const rect = player.getBoundingClientRect();
        if (
          latestDragCurrentX >= rect.left &&
          latestDragCurrentX <= rect.right &&
          latestDragCurrentY >= rect.top &&
          latestDragCurrentY <= rect.bottom
        ) {
          const channelAttr = player.getAttribute("data-player-wrapper");
          if (
            channelAttr &&
            channelAttr !== currentDragChannel &&
            channelAttr in latestStreamPositions &&
            latestStreamPositions[channelAttr] !== undefined
          ) {
            targetChannel = channelAttr;
            targetPos = latestStreamPositions[channelAttr]!;
          }
        }
      });

      if (targetChannel && targetPos !== -1) {
        const newStreamPositions: Record<string, number> = {
          ...latestStreamPositions,
        };
        newStreamPositions[currentDragChannel] = targetPos;
        newStreamPositions[targetChannel] = draggedPos;
        setStreamPositions(newStreamPositions); // Update positions in store
      }
    }

    // Reset drag state in store
    setDragState({
      isDragging: false,
      dragChannel: null,
    });
    dragChannelRef.current = null; // Clear ref
  });

  // Effect to manage global listeners
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      updateDrag(e.clientX, e.clientY);
    };
    const handleMouseUp = () => {
      endDrag();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp, { once: true }); // endDrag only needs to fire once

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      // No need to remove mouseup as { once: true } handles it
    };
  }, [endDrag, updateDrag, isDragging]); // Runs only when isDragging changes

  // --- Exposed Context Function ---

  const startDrag = useStableCallback(
    (channel: string, x: number, y: number) => {
      setDragState({
        isDragging: true,
        dragChannel: channel,
        dragStartX: x,
        dragStartY: y,
        dragCurrentX: x,
        dragCurrentY: y,
      });
      dragChannelRef.current = channel;
    },
  );

  // --- Provide Context ---

  const contextValue: DragContextType = useMemo(
    () => ({
      startDrag,
    }),
    [startDrag],
  );

  return (
    <DragContext.Provider value={contextValue}>{children}</DragContext.Provider>
  );
};
