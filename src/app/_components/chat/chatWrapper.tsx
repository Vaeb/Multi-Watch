"use client";

import { memo } from "react";
import { type ChatProps } from "./chat";
import { type MainState, useMainStore } from "../../stores/mainStore";
import { getShowChat } from "../../utils/getShowChat";
import { log } from "../../utils/log";
import { useStableCallback } from "~/app/hooks/useStableCallback";

interface ChatWrapperProps extends ChatProps {
  children: React.ReactNode;
}

function ChatWrapperComponent({ children, channel }: ChatWrapperProps) {
  const selectorForChannel = useStableCallback(
    (state: MainState) => getShowChat(state) === channel,
  );

  const showChat = useMainStore(selectorForChannel);

  log(`[ChatWrapper] ${showChat ? "Showing" : "Hiding"} ${channel} chat`);

  return <div className={`${showChat ? "" : "invisible"}`}>{children}</div>;
}

export const ChatWrapper = memo(ChatWrapperComponent);
