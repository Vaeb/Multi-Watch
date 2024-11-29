"use client";

import { memo } from "react";
import { Player } from "./player";
import { type MainState, useMainStore } from "../stores/mainStore";
import { Chat } from "./chat";
import { useShallow } from "zustand/shallow";

const selector = (state: MainState) => ({
  streams: state.streams,
  newestStream: state.newestStream,
});

function StreamsComponent() {
  const { streams, newestStream } = useMainStore(useShallow(selector));

  const [_, ...remainingStreams] = streams;
  const firstStreamArr = streams.slice(0, 1);

  return (
    <div className="flex flex-1">
      <div className="flex h-full flex-1 flex-col">
        {firstStreamArr.map((stream) => (
          <Player
            key={`${stream.value}-${stream.type}`}
            type={stream.type}
            channel={stream.value}
            focus={true}
            first={newestStream === stream.value}
          />
        ))}
        <div className="flex flex-1 flex-row">
          {remainingStreams.map((stream) => (
            <Player
              key={`${stream.value}-${stream.type}`}
              type={stream.type}
              channel={stream.value}
              first={newestStream === stream.value}
            />
          ))}
        </div>
      </div>
      <Chat type="twitch" channel="dripp" />
    </div>
  );
}

export const Streams = memo(StreamsComponent);
