"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { stateApplyLog } from "./storeUtils";
import { type ChatroomsInfo } from "../../types";

export interface ChatMethods {
  scrollToBottom: () => void;
}

const filterObjFrom = (obj: Record<string, any>, base: string[]) =>
  Object.assign({}, ...base.map((key) => ({ [key]: obj[key] }))) as Record<
    string,
    any
  >;

export interface KickState {
  chatrooms: Record<string, ChatroomsInfo>;
  chatMethods: Record<string, ChatMethods>;

  actions: {
    setChatrooms: (chatrooms: KickState["chatrooms"]) => void;
    setChatMethods: (channel: string, chatMethods: ChatMethods) => void;
    syncChannels: (channels: string[]) => void;
  };
}

export const useKickStore = create<KickState>()(
  subscribeWithSelector(
    stateApplyLog<KickState>((set) => ({
      chatrooms: {},
      chatMethods: {},

      actions: {
        setChatrooms: (chatrooms) => set({ chatrooms }),

        setChatMethods: (channel, chatMethods) =>
          set((state) => ({
            chatMethods: { ...state.chatMethods, [channel]: chatMethods },
          })),

        syncChannels: (channels) =>
          set((state) => ({
            chatMethods: filterObjFrom(state.chatMethods, channels),
          })),
      },
    })),
  ),
);
