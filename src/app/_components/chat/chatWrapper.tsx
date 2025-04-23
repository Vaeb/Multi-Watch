"use client";

import { memo } from "react";
import { Chat } from "./chat";
import { type MainState, useMainStore } from "../../stores/mainStore";
import { getShowChat } from "../../utils/getShowChat";
import { log } from "../../utils/log";
import { useStableCallback } from "~/app/hooks/useStableCallback";
import { type Platform } from "~/types";

interface ChatWrapperProps {
  channel: string;
  type: Platform;
}

function ChatWrapperComponent({ channel, type }: ChatWrapperProps) {
  const selectorForChannel = useStableCallback(
    (state: MainState) => getShowChat(state) === channel,
  );

  const showChat = useMainStore(selectorForChannel);

  log(`[ChatWrapper] ${showChat ? "Showing" : "Hiding"} ${channel} chat`);

  return (
    <div className={`${showChat ? "" : "invisible"}`}>
      <Chat type={type} channel={channel} />
    </div>
  );
}

export const ChatWrapper = memo(ChatWrapperComponent);
