import { memo } from "react";
import { type Platform } from "~/types";
import { KickChat } from "./kickChat";
import { log } from "../utils/log";

export interface ChatProps {
  type?: Platform;
  channel: string;
}

const getSrc = (type: Platform, channel: string) => {
  if (type === "twitch")
    return `https://www.twitch.tv/embed/${channel}/chat?darkpopout&parent=localhost&parent=multi.vaeb.io&parent=vaeb.io`;
  if (type === "kick") return `https://kick.com/${channel}/chatroom`;
};

function ChatComponent({ type = "twitch", channel }: ChatProps) {
  log("[Chat] Re-rendered", channel);

  if (type === "twitch") {
    return (
      <iframe
        className="absolute h-full w-full border-none"
        src={getSrc(type, channel)}
        scrolling="no"
        frameBorder="0"
      ></iframe>
    );
  } else if (type === "kick") {
    return <KickChat channel={channel} />;
  }
}

export const Chat = memo(ChatComponent);
