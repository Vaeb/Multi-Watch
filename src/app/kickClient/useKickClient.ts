"use client";

import { type RefObject, useCallback, useEffect, useState } from "react";
import { type VirtuosoMessageListMethods } from "@virtuoso.dev/message-list";
import { useKickStore } from "../stores/kickStore";
import { log } from "../utils/log";

// [Client] If channel name not in list of chatrooms, send message to server
// [Server] Lookup chatroom id for channel (first re-check cache), save it in json, respond to client

const BASE_URL = "wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679";
const createWebSocket = (channel: string, chatroomId: number) => {
  const urlParams = new URLSearchParams({
    protocol: "7",
    client: "js",
    version: "7.4.0",
    flash: "false",
  });

  const url = `${BASE_URL}?${urlParams.toString()}`;
  const socket = new WebSocket(url);

  socket.onopen = () => {
    const chatroomString = `chatrooms.${chatroomId}.v2`;
    const connect = JSON.stringify({
      event: "pusher:subscribe",
      data: { auth: "", channel: chatroomString },
    });

    socket.send(connect);

    log(
      `[createWebSocket] Connected to Kick pusher socket. Subscribing to channel '${channel}': ${chatroomString}`,
    );
  };
  return socket;
};

export interface Message {
  id: string;
  time: string;
  author: string;
  authorColor: string;
  content: string;
}

const tzOffsetHours = new Date().getTimezoneOffset() / -60;

const toChatMessage = (message: Record<string, any>): Message => {
  const hoursNum =
    (Number(message.created_at.slice(11, 13)) + tzOffsetHours) % 24;
  const hours = hoursNum > 9 ? hoursNum : `0${hoursNum}`;
  const minutes = message.created_at.slice(14, 16);

  return {
    id: message.id,
    time: `${hours}:${minutes}`,
    author: message.sender.username,
    authorColor: message.sender.identity.color,
    content: (message.content as string).replace(
      /\[emote:(\d+):(\w+)\]/g,
      (_, __, emoteName) => emoteName as string,
    ),
  };
};

const parseMessage = (message: string) => {
  try {
    const messageEventJSON: Record<string, any> = JSON.parse(message);
    if (messageEventJSON.event === "App\\Events\\ChatMessageEvent") {
      return {
        type: "ChatMessage",
        message: toChatMessage(JSON.parse(messageEventJSON.data)),
      };
    } else if (messageEventJSON.event === "App\\Events\\SubscriptionEvent") {
    } else if (messageEventJSON.event === "App\\Events\\RaidEvent") {
    }
    return null;
  } catch (error) {
    console.error("[getMessage] Error checking for message:", error);
    return null;
  }
};

export const useKickClient = (
  channel: string,
  messageListRef: RefObject<VirtuosoMessageListMethods<Message, any>>,
) => {
  log(`[useKickClient] Re-rendered kick chat client for ${channel}`);

  const [messages, setMessages] = useState<Message[]>([
    // {
    //   author: "AA",
    //   authorColor: "#f00",
    //   content: "111",
    //   id: "001",
    //   time: "777",
    // },
    // {
    //   author: "BB",
    //   authorColor: "#00f",
    //   content: "222",
    //   id: "002",
    //   time: "888",
    // },
  ]);

  const channelLower = channel.toLowerCase();
  const chatroomId = useKickStore(
    useCallback((state) => state.chatrooms[channelLower]?.id, [channelLower]),
  );

  useEffect(() => {
    if (!chatroomId) return;

    log(
      `[useKickClient] Initialising kick chat client for ${channel}`,
      chatroomId,
    );

    const socket = createWebSocket(channel, chatroomId);

    socket.onmessage = ({ data }) => {
      const { type, message } = parseMessage(data.toString()) || {};
      // log(`[useKickClient] onMessage`, type, message);
      if (type === "ChatMessage" && message) {
        messageListRef.current?.data.append(
          [message],
          ({ atBottom, scrollInProgress }) => {
            if (atBottom || scrollInProgress) {
              return "smooth";
            } else {
              return false;
            }
          },
        );
      }
    };

    socket.onclose = () => {
      log(`[useKickClient] Disconnected from ${channel} Kick pusher socket`);
    };

    return () => {
      log(`[useKickClient] Unmounting ${channel} kick client`);
      socket.close();
    };
  }, [messageListRef, channel, chatroomId]);

  // client.login({  })

  return messages;
};
