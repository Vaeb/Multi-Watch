"use client";

import { memo } from "react";
import { Player } from "./videoClient";
import { type MainState, useMainStore } from "../stores/mainStore";
import { Chat, ChatContainer } from "./chat";
import { useShallow } from "zustand/shallow";
import { ChatWrapper } from "./chatWrapper";
import { PlayerWrapper } from "./playerWrapper";

const selector = (state: MainState) => ({
  streams: state.streams,
  streamPositions: state.streamPositions,
  viewMode: state.viewMode,
  chatShown: state.chatShown,
});

function StreamsComponent() {
  const { streams, streamPositions, viewMode, chatShown } = useMainStore(
    useShallow(selector),
  );
  console.log("[Streams] Re-rendered");

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
            >
              <Player type={stream.type} channel={stream.value} />
            </PlayerWrapper>
          );
        })}
      </div>
      {chatShown ? (
        <ChatContainer>
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
      ) : null}
    </div>
  );
}

export const Streams = memo(StreamsComponent);
