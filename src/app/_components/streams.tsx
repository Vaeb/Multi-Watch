"use client";

import { memo } from "react";
import { Player } from "./videoClient";
import { type MainState, useMainStore } from "../stores/mainStore";
import { Chat } from "./chat";
import { ChatContainer } from "./chatContainer";
import { useShallow } from "zustand/shallow";
import { ChatWrapper } from "./chatWrapper";
import { PlayerWrapper } from "./playerWrapper";
import { type PersistState, usePersistStore } from "../stores/persistStore";
import { log } from "../utils/log";

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
  log("[Page Streams] Re-rendered");

  return (
    <div className="flex flex-1">
      <div className="relative h-full flex-1">
        {streams.map((stream, i) => {
          return (
            <PlayerWrapper
              key={`video-${stream.value}-${stream.type}`}
              channel={stream.value}
              type={stream.type}
              total={streams.length}
              pos={streamPositions[stream.value]!}
              viewMode={viewMode}
              gridMode={gridMode}
              focusHeight={focusHeight}
            >
              <Player type={stream.type} channel={stream.value} />
            </PlayerWrapper>
          );
        })}
      </div>
      <ChatContainer show={chatShown}>
        {streams.map((stream) => {
          return (
            <ChatWrapper
              key={`chat-${stream.value}-${stream.type}`}
              channel={stream.value}
            >
              <Chat type={stream.type} channel={stream.value} />
            </ChatWrapper>
          );
        })}
      </ChatContainer>
    </div>
  );
}

export const Streams = memo(StreamsComponent);
