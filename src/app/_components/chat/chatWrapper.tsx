"use client";

import { memo } from "react";
import { type ChatProps } from "./chat";
import { useMainStore } from "../../stores/mainStore";
import { getShowChat } from "../../utils/getShowChat";
import { log } from "../../utils/log";

interface ChatWrapperProps extends ChatProps {
  children: React.ReactNode;
}

function ChatWrapperComponent({ children, channel }: ChatWrapperProps) {
  const showChat = useMainStore((state) => getShowChat(state) === channel);

  log(`[ChatWrapper] ${showChat ? "Showing" : "Hiding"} ${channel} chat`);

  return <div className={`${showChat ? "" : "invisible"}`}>{children}</div>;
}

export const ChatWrapper = memo(ChatWrapperComponent);
