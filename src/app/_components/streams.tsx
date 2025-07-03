"use client";

import { memo, useRef, useState, useEffect, useMemo } from "react";
import { type MainState, useMainStore } from "../stores/mainStore";
import { ChatsContainer } from "./chat/chatsContainer";
import { useShallow } from "zustand/shallow";
import { ChatWrapper } from "./chat/chatWrapper";
import { PlayerWrapper } from "./player/playerWrapper";
import { VerticalResizer } from "./player/verticalResizer";
import { DragProvider } from "./player/dragContext";
import { log } from "../utils/log";
import { layoutCells } from "../utils/layoutCells";
import { SizeManager } from "./sizeManager";
// import { log } from "../utils/log";

const selector = (state: MainState) => ({
  streams: state.streams,
  streamPositions: state.streamPositions,
  viewMode: state.viewMode,
  chatShown: state.chatShown,
  wasChatShown: state.wasChatShown,
  actions: state.actions,
});

function StreamsComponent() {
  const {
    streams,
    streamPositions,
    viewMode,
    chatShown,
    wasChatShown,
    actions: { setContainerSize, setStreamCells },
  } = useMainStore(useShallow(selector));
  const focusHeight = useMainStore((state) => state.focusHeight);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  // log("[Page Streams] Re-rendered");

  const cells = useMemo(
    () =>
      layoutCells(
        streams.length,
        containerWidth,
        containerHeight,
        viewMode,
        focusHeight,
      ),
    [streams.length, containerWidth, containerHeight, viewMode, focusHeight],
  );

  useEffect(() => {
    setStreamCells(cells);
  }, [setStreamCells, cells]);

  useEffect(() => {
    const containerElement = containerRef.current;
    if (!containerElement) return;

    const resizeObserver = new ResizeObserver((entries) => {
      log("Updating dimensions on resize");
      for (const entry of entries) {
        if (entry.target === containerElement) {
          setContainerWidth(entry.contentRect.width);
          setContainerHeight(entry.contentRect.height);
          setContainerSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
          log("Dimensions updated");
        }
      }
    });

    resizeObserver.observe(containerElement);
    // Initial dimensions
    setContainerWidth(containerElement.offsetWidth);
    setContainerHeight(containerElement.offsetHeight);
    setContainerSize({
      width: containerElement.offsetWidth,
      height: containerElement.offsetHeight,
    });
    return () => {
      resizeObserver.disconnect();
    };
  }, [setContainerSize]);

  return (
    <>
      <SizeManager />
      <div className="flex flex-1">
        <div ref={containerRef} className="relative h-full flex-1">
          {streams.map((stream) => {
            return (
              <PlayerWrapper
                key={`video-${stream.value}-${stream.type}`}
                channel={stream.value}
                type={stream.type}
                cell={cells[streamPositions[stream.value]!]}
              />
            );
          })}
          {viewMode === "focused" && streams.length > 1 && (
            <VerticalResizer top={Number(focusHeight)} />
          )}
        </div>
        {wasChatShown ? (
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
        ) : null}
      </div>
    </>
  );
}

export const Streams = memo(StreamsComponent);
