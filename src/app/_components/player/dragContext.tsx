"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { useMainStore } from "../../stores/mainStore";
import { useShallow } from "zustand/shallow";
import { useStableCallback } from "~/app/hooks/useStableCallback";

interface DragContextType {
  onMouseDownDrag: (channel: string, e: React.MouseEvent) => void;
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
  hoveredChannel: state.hoveredChannel,
  setDragState: state.actions.setDragState, // We'll add this action to mainStore
  setStreamPositions: state.actions.setStreamPositions,
  setHoveredChannel: state.actions.setHoveredChannel,
});

export const DragProvider: React.FC<DragProviderProps> = ({ children }) => {
  const {
    isDragging,
    hoveredChannel,
    setDragState,
    setStreamPositions,
    setHoveredChannel,
  } = useMainStore(useShallow(dragStoreSelector));

  const dragChannelRef = useRef<string | null>(null); // Ref to track current drag channel

  // Track mouse position to detect if there was movement
  const startPosRef = useRef({ x: 0, y: 0 });
  const didMoveRef = useRef(false);

  // --- Internal Drag Logic ---

  // Function to handle drag end logic
  const endDrag = useStableCallback(() => {
    if (!dragChannelRef.current) return;

    // Read necessary state directly via getState() to avoid stale closures
    const latestStreamPositions = useMainStore.getState().streamPositions;
    const latestHoveredChannel = useMainStore.getState().hoveredChannel;
    const currentDragChannel = dragChannelRef.current;

    if (
      currentDragChannel &&
      latestHoveredChannel &&
      latestStreamPositions[currentDragChannel] !== undefined &&
      latestStreamPositions[latestHoveredChannel] !== undefined
    ) {
      const draggedPos = latestStreamPositions[currentDragChannel];
      const targetPos = latestStreamPositions[latestHoveredChannel];

      const newStreamPositions: Record<string, number> = {
        ...latestStreamPositions,
      };
      newStreamPositions[currentDragChannel] = targetPos;
      newStreamPositions[latestHoveredChannel] = draggedPos;
      setStreamPositions(newStreamPositions); // Update positions in store
    }

    // Reset drag state in store
    setDragState({
      isDragging: false,
      dragChannel: null,
    });
    setHoveredChannel(null); // Clear hovered channel
    dragChannelRef.current = null; // Clear ref
  });

  // Track when mouse goes down for a potential drag
  const onMouseDownDrag = useStableCallback(
    (channel: string, e: React.MouseEvent) => {
      // Store initial position
      startPosRef.current = { x: e.clientX, y: e.clientY };
      didMoveRef.current = false;

      // Setup mousemove and mouseup listeners to check whether it's a click or drag
      const onMouseMove = (moveEvent: MouseEvent) => {
        // Check if mouse has moved enough to consider it a drag
        const dx = moveEvent.clientX - startPosRef.current.x;
        const dy = moveEvent.clientY - startPosRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If moved more than 5px, consider it a drag
        if (distance > 5) {
          didMoveRef.current = true;

          // Initiate drag and cleanup listeners
          e.preventDefault(); // Prevent any default action

          // Start drag!
          setDragState({
            isDragging: true,
            dragChannel: channel,
            dragStartX: startPosRef.current.x,
            dragStartY: startPosRef.current.y,
            dragCurrentX: startPosRef.current.x,
            dragCurrentY: startPosRef.current.y,
          });
          dragChannelRef.current = channel;

          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("mouseup", onMouseUp);
        }
      };

      const onMouseUp = () => {
        // If mouse was released without moving enough, simulate click on underlying element
        if (!didMoveRef.current) {
          // Instead of synthetic click, use the player API
          const { streamPlayer } = useMainStore.getState();
          const player = streamPlayer[channel];

          if (player && "getPlaybackStats" in player) {
            // For Twitch players, use the play/pause API methods if available
            // Note: Using optional chaining to safely call these methods if they exist
            try {
              if (player.isPaused()) {
                player.play();
              } else {
                player.pause();
              }
            } catch (e) {
              console.log("Error toggling player state", e);
            }
          }
        }

        // Clean up
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      // Add temporary listeners to track mouse movement
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp, { once: true });
    },
  );

  // Effect to manage global listeners
  useEffect(() => {
    if (!isDragging) return;

    const currentDragChannel = dragChannelRef.current;

    // All player wrapper elements
    const players = Array.from(
      document.querySelectorAll<HTMLElement>("[data-player-wrapper]"),
    );

    // Cache rects for performance
    const playerRects = new Map<string, DOMRect>();
    players.forEach((p) => {
      const channel = p.dataset.playerWrapper;
      if (channel) {
        playerRects.set(channel, p.getBoundingClientRect());
      }
    });

    // Handle mouse move during drag
    const handleMouseMove = (e: MouseEvent) => {
      // Update drag coordinates
      setDragState({ dragCurrentX: e.clientX, dragCurrentY: e.clientY });

      // Check for hovered channel
      let newHoveredChannel: string | null = null;
      for (const [channel, rect] of playerRects.entries()) {
        if (
          channel !== currentDragChannel &&
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          newHoveredChannel = channel;
          break;
        }
      }

      if (newHoveredChannel !== hoveredChannel) {
        setHoveredChannel(newHoveredChannel);
      }
    };

    // Handle mouse up after drag
    const handleMouseUp = () => {
      endDrag();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp, { once: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isDragging, endDrag, setDragState, setHoveredChannel, hoveredChannel]); // Runs only when isDragging changes

  // --- Provide Context ---

  const contextValue: DragContextType = useMemo(
    () => ({
      onMouseDownDrag,
    }),
    [onMouseDownDrag],
  );

  return (
    <DragContext.Provider value={contextValue}>{children}</DragContext.Provider>
  );
};
