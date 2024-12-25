import { memo } from "react";
import { type Platform } from "~/types";
import { ChatTitle } from "./chatTitle";
import { KickChat } from "./kickChat";

export interface ChatProps {
  type?: Platform;
  channel: string;
}

export function ChatContainer({
  show,
  children,
}: {
  show: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`flex h-full w-[470px] max-w-[25%] flex-col ${show ? "" : "hidden"}`}
    >
      <ChatTitle />
      <div className={`relative flex-1`}>
        {children}
        <div className="absolute h-[48px] w-full bg-[#18181b] p-4 pt-1 text-sm font-bold">
          <p>
            MultiWatch Tip: Hover at the top of a stream to view chat and audio
            controls.
          </p>
        </div>
      </div>
    </div>
  );
}

const getSrc = (type: Platform, channel: string) => {
  if (type === "twitch")
    return `https://www.twitch.tv/embed/${channel}/chat?darkpopout&parent=localhost&parent=multi.vaeb.io&parent=vaeb.io`;
  if (type === "kick") return `https://kick.com/${channel}/chatroom`;
};

function ChatComponent({ type = "twitch", channel }: ChatProps) {
  console.log("[Chat] Re-rendered", channel);

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
