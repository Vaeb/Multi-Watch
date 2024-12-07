"use client";

import { memo } from "react";
import { type ChatProps } from "./chat";
import { useMainStore } from "../stores/mainStore";
import { getShowChat } from "../utils/getShowChat";

interface ChatWrapperProps extends ChatProps {
  children: React.ReactNode;
}

function ChatWrapperComponent({ children, channel }: ChatWrapperProps) {
  const showChat = useMainStore((state) => getShowChat(state) === channel);

  console.log(
    `[ChatWrapper] ${showChat ? "Showing" : "Hiding"} ${channel} chat`,
  );

  return <div className={`${showChat ? "" : "invisible"}`}>{children}</div>;
}

export const ChatWrapper = memo(ChatWrapperComponent);
