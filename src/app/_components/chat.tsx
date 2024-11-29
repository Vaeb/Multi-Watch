import { memo } from "react";
import { type Platform } from "~/types";

interface ChatProps {
  type?: Platform;
  channel: string;
}

function ChatComponent({ type = "twitch", channel }: ChatProps) {
  return (
    <div className="flex w-[530px] max-w-[25%]">
      <iframe
        className="h-full w-full border-none"
        src={`https://www.twitch.tv/embed/${channel}/chat?darkpopout&parent=localhost`}
        scrolling="no"
        frameBorder="0"
      ></iframe>
    </div>
  );
}

export const Chat = memo(ChatComponent);
