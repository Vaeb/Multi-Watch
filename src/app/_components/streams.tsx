"use client";

import { memo } from "react";
import { Player } from "./video";
import { type MainState, useMainStore } from "../stores/mainStore";
import { Chat, ChatContainer } from "./chat";
import { useShallow } from "zustand/shallow";
import { ChatWrapper } from "./chatWrapper";
import { PlayerWrapper } from "./playerWrapper";

const selector = (state: MainState) => ({
  streams: state.streams,
  newestStream: state.newestStream,
});

function StreamsComponent() {
  const { streams, newestStream } = useMainStore(useShallow(selector));

  return (
    <div className="flex flex-1">
      <div className="flex h-full flex-1 flex-wrap">
        {/* <div className="grid h-full flex-1 grid-flow-row-dense grid-cols-2 grid-rows-2"> */}
        {streams.map((stream, i) => (
          <PlayerWrapper
            key={`video-${stream.value}-${stream.type}`}
            channel={stream.value}
            focus={i === 0}
          >
            <Player type={stream.type} channel={stream.value} />
          </PlayerWrapper>
        ))}
      </div>
      <ChatContainer>
        {streams.map((stream) => (
          <ChatWrapper
            key={`chat-${stream.value}-${stream.type}`}
            channel={stream.value}
          >
            <Chat type={stream.type} channel={stream.value} />
          </ChatWrapper>
        ))}
      </ChatContainer>
    </div>
  );
}

export const Streams = memo(StreamsComponent);
