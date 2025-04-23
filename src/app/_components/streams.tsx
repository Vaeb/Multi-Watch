"use client";

import { memo, useRef, useState, useEffect, useMemo } from "react";
import { Player } from "./player/videoClient";
import { type MainState, useMainStore } from "../stores/mainStore";
import { Chat } from "./chat/chat";
import { ChatsContainer } from "./chat/chatsContainer";
import { useShallow } from "zustand/shallow";
import { ChatWrapper } from "./chat/chatWrapper";
import { PlayerWrapper } from "./player/playerWrapper";
import { type PersistState, usePersistStore } from "../stores/persistStore";
import { VerticalResizer } from "./player/verticalResizer";
import { DragProvider } from "./player/dragContext";
import { log } from "../utils/log";
import { layoutCellsTight } from "../utils/layoutCellsTight";
// import { log } from "../utils/log";

const selector = (state: MainState) => ({
  streams: state.streams,
  streamPositions: state.streamPositions,
  viewMode: state.viewMode,
  chatShown: state.chatShown,
});

const selectorPersist = (state: PersistState) => ({
  gridMode: state.gridMode,
  focusHeight: state.focusHeight,
});

function StreamsComponent() {
  const { streams, streamPositions, viewMode, chatShown } = useMainStore(
    useShallow(selector),
  );
  const { gridMode, focusHeight } = usePersistStore(
    useShallow(selectorPersist),
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  // log("[Page Streams] Re-rendered");

  const layoutCells = useMemo(() => {
    log("Recalculating cells layout");
    return layoutCellsTight(
      streams.length,
      containerWidth,
      containerHeight,
      viewMode,
      focusHeight,
    );
  }, [streams.length, containerWidth, containerHeight, viewMode, focusHeight]);

  useEffect(() => {
    const containerElement = containerRef.current;
    if (!containerElement) return;

    const resizeObserver = new ResizeObserver((entries) => {
      log("Updating dimensions on resize");
      for (const entry of entries) {
        if (entry.target === containerElement) {
          setContainerWidth(entry.contentRect.width);
          setContainerHeight(entry.contentRect.height);
          log("Dimensions updated");
        }
      }
    });

    resizeObserver.observe(containerElement);
    // Initial dimensions
    setContainerWidth(containerElement.offsetWidth);
    setContainerHeight(containerElement.offsetHeight);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <DragProvider>
      <div className="flex flex-1">
        <div ref={containerRef} className="relative h-full flex-1">
          {streams.map((stream) => {
            return (
              <PlayerWrapper
                key={`video-${stream.value}-${stream.type}`}
                channel={stream.value}
                type={stream.type}
                cell={layoutCells[streamPositions[stream.value]!]}
              />
            );
          })}
          {viewMode === "focused" && streams.length > 1 && (
            <VerticalResizer top={Number(focusHeight)} />
          )}
        </div>
        <ChatsContainer show={chatShown}>
          {streams.map((stream) => {
            return (
              <ChatWrapper
                key={`chat-${stream.value}-${stream.type}`}
                channel={stream.value}
                type={stream.type}
              />
            );
          })}
        </ChatsContainer>
      </div>
    </DragProvider>
  );
}

export const Streams = memo(StreamsComponent);
