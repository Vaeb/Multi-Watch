import { memo } from "react";
import { Player } from "./videq";
import { Chat, ChatContainer } from "./chat";
import { ChatWrapper } from "./chatWrapper";
import { PlayerWrapper } from "./playerWrapper";
import { slugToStream } from "../utils/slugToStream";

interface StreamsProps {
  slugStreams: string[];
}

function StreamsComponent({ slugStreams }: StreamsProps) {
  console.log("[Streams] Re-rendered", slugStreams);

  return (
    <div className="flex flex-1">
      <div className="relative h-full flex-1">
        {/* <div className="grid h-full flex-1 grid-flow-row-dense grid-cols-2 grid-rows-2"> */}
        {slugStreams.map((slug, i) => {
          const stream = slugToStream(slug);
          return (
            <PlayerWrapper
              key={`video-${stream.value}-${stream.type}`}
              total={slugStreams.length}
              channel={stream.value}
            >
              <Player
                type={stream.type}
                channel={stream.value}
                first={i === 0}
              />
            </PlayerWrapper>
          );
        })}
      </div>
      <ChatContainer>
        {slugStreams.map((slug) => {
          const stream = slugToStream(slug);
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
