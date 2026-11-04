"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { stateApplyLog } from "./storeUtils";
import { type ChatroomsInfo } from "../../types";

export interface ChatMethods {
  scrollToBottom: () => void;
}

export interface KickVod {
  vodId: string;
  createdAt: string;
}

const filterObjFrom = (obj: Record<string, any>, base: string[]) =>
  Object.assign({}, ...base.map((key) => ({ [key]: obj[key] }))) as Record<
    string,
    any
  >;

export interface KickState {
  chatrooms: Record<string, ChatroomsInfo>;
  chatroomsLower: Record<string, ChatroomsInfo>;
  chatMethods: Record<string, ChatMethods>;
  vods: Record<string, KickVod | null>;
  isChatroomsReady: boolean;

  actions: {
    setChatrooms: (chatrooms: KickState["chatrooms"]) => void;
    setChatMethods: (channel: string, chatMethods: ChatMethods) => void;
    setVod: (channel: string, vod: KickVod | null) => void;
    syncChannels: (channels: string[]) => void;
  };
}

export const useKickStore = create<KickState>()(
  subscribeWithSelector(
    stateApplyLog<KickState>((set) => ({
      chatrooms: {},
      chatroomsLower: {},
      chatMethods: {},
      vods: {},
      isChatroomsReady: false,

      actions: {
        setChatrooms: (chatrooms) =>
          set({
            chatrooms,
            chatroomsLower: Object.fromEntries(
              Object.entries(chatrooms).map(([channel, data]) => [
                channel.toLowerCase(),
                data,
              ]),
            ),
            isChatroomsReady: true,
          }),

        setChatMethods: (channel, chatMethods) =>
          set((state) => ({
            chatMethods: { ...state.chatMethods, [channel]: chatMethods },
          })),

        setVod: (channel, vod) =>
          set((state) => ({
            vods: { ...state.vods, [channel]: vod },
          })),

        syncChannels: (channels) =>
          set((state) => ({
            chatMethods: filterObjFrom(state.chatMethods, channels),
            vods: filterObjFrom(state.vods, channels),
          })),
      },
    })),
  ),
);
