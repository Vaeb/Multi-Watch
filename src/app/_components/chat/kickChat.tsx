"use client";

import { memo, useEffect, useRef } from "react";
import { type Message, useKickClient } from "../../kickClient/useKickClient";
import { useKickEmotes } from "../../kickClient/useKickEmotes";
import {
  VirtuosoMessageList,
  VirtuosoMessageListLicense,
  type VirtuosoMessageListMethods,
  type VirtuosoMessageListProps,
} from "@virtuoso.dev/message-list";
import { type ChatMethods, useKickStore } from "../../stores/kickStore";
import { log } from "../../utils/log";
import { KickEmoteContext, KickMessageContent } from "./kickEmoteText";

export interface ChatProps {
  channel: string;
}

interface MessageListContext {}
type VirtuosoProps = VirtuosoMessageListProps<Message, MessageListContext>;

const ChatItem: VirtuosoProps["ItemContent"] = ({ data }) => {
  return (
    <div style={{ padding: "5px 20px", overflowWrap: "break-word" }}>
      <span style={{ color: "#ADADB8", marginRight: 5 }}>{data.time}</span>
      <span style={{ color: data.authorColor }}>{data.author}: </span>
      <KickMessageContent content={data.content} />
    </div>
  );
};

function KickChatComponent({ channel }: ChatProps) {
  const messageListRef = useRef<VirtuosoMessageListMethods<Message>>(null);
  const messages = useKickClient(channel, messageListRef);
  const emotes = useKickEmotes(channel);

  useEffect(() => {
    const chatMethods: ChatMethods = {
      scrollToBottom: () => {
        messageListRef.current?.scrollToItem({
          index: "LAST",
          align: "end",
          behavior: "smooth",
        });
      },
    };

    useKickStore.getState().actions.setChatMethods(channel, chatMethods);
  }, [channel]);

  log(`[KickChat] Re-rendered ${channel}`);

  return (
    <KickEmoteContext.Provider value={emotes}>
      <div className="absolute h-full w-full pb-4 pt-[76px]">
        <div className="flex h-full w-full flex-col text-sm">
          <VirtuosoMessageListLicense licenseKey={""}>
            <VirtuosoMessageList<Message, MessageListContext>
              key={`kick-chat-${channel}`}
              className="w-full flex-1"
              initialData={messages}
              shortSizeAlign="bottom-smooth"
              initialLocation={{ index: "LAST", align: "end" }}
              computeItemKey={({ data }) => data.id}
              ItemContent={ChatItem}
              ref={messageListRef}
            />
          </VirtuosoMessageListLicense>
        </div>
      </div>
    </KickEmoteContext.Provider>
  );
}

export const KickChat = memo(KickChatComponent);
