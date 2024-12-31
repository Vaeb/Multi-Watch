"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { streamsToPath } from "../utils/streamsToPath";
import { orderStreams } from "../utils/orderStreams";
import { stateApplyLog } from "./storeUtils";
import { type Stream, type ViewMode } from "./storeTypes";
import { useKickStore } from "./kickStore";
import { log } from "../utils/log";

const fromNewChannels = <T extends Record<string, any>>(
  channels: string[],
  base: T,
) =>
  Object.assign(
    {},
    ...channels.map((channel) => ({
      [channel]: base[channel],
    })),
  ) as T;

export interface MainState {
  initialised: boolean;

  streams: Stream[];
  streamsMap: Record<string, Stream>;
  streamPositions: Record<string, number>;
  streamPlayer: Record<string, any>;
  manuallyMuted: Record<string, boolean>;
  newestStream: string;
  selectedChat: string;

  viewMode: ViewMode;

  updateShown: boolean;
  settingsShown: boolean;
  nopixelShown: boolean;
  chatShown: boolean;

  actions: {
    markInitialised: () => void;

    setStreams: (
      streams: Stream[],
      streamPositions?: MainState["streamPositions"],
    ) => void;
    cycleStreams: () => void;
    setStreamPlayer: (channel: string, player: any) => void;
    setManuallyMuted: (channel: string, muted: boolean) => void;
    setNewestStream: (newestStream: string) => void;
    setSelectedChat: (selectedChat: string) => void;

    setViewMode: (viewMode: ViewMode) => void;
    toggleViewMode: () => void;

    setUpdateShown: (updateShown: boolean) => void;
    toggleUpdateShown: () => void;
    setSettingsShown: (shown: boolean) => void;
    toggleSettingsShown: () => void;
    toggleNopixel: () => void;
    setChat: (chatShown: boolean) => void;
    toggleChat: () => void;
  };
}

export const useMainStore = create<MainState>()(
  subscribeWithSelector(
    stateApplyLog<MainState>((set) => ({
      initialised: false,

      streams: [],
      streamsMap: {},
      streamPositions: {},
      streamPlayer: {},
      manuallyMuted: {},
      newestStream: "",
      selectedChat: "",

      viewMode: "focused",

      updateShown: false,
      settingsShown: false,
      nopixelShown: false,
      chatShown: true,

      actions: {
        markInitialised: () => set({ initialised: true }),

        setStreams: (streams, streamPositions) => {
          const channels = streams.map((stream) => stream.value);

          set((state) => {
            const streamsMap = Object.assign(
              {},
              ...streams.map((stream) => ({ [stream.value]: stream })),
            ) as Record<string, Stream>;

            log("setStreams", streams, streamPositions);

            return {
              streams,
              streamsMap,
              streamPositions:
                streamPositions ??
                (Object.assign(
                  {},
                  ...orderStreams(streams).map(({ value }, i) => ({
                    [value]: i,
                  })),
                ) as Record<string, number>),
              streamPlayer: fromNewChannels(channels, state.streamPlayer),
              manuallyMuted: fromNewChannels(channels, state.manuallyMuted),
              newestStream: streamsMap[state.newestStream]
                ? state.newestStream
                : "",
              selectedChat: streamsMap[state.selectedChat]
                ? state.selectedChat
                : "",
            };
          });

          useKickStore.getState().actions.syncChannels(channels);
        },

        cycleStreams: () =>
          set((state) => {
            const { streams, streamPositions: streamPositionsBase } = state;
            const entries = Object.entries(streamPositionsBase);
            const streamPositions = Object.assign(
              {},
              ...entries.map(([channel, pos]) => ({
                [channel]: (pos + 1) % entries.length,
              })),
            );

            window.history.pushState(
              {},
              "",
              streamsToPath(streams, streamPositions),
            );

            return { streamPositions };
          }),

        setStreamPlayer: (channel, player) =>
          set((state) => ({
            streamPlayer: { ...state.streamPlayer, [channel]: player },
          })),

        setManuallyMuted: (channel, muted) =>
          set((state) => ({
            manuallyMuted: { ...state.manuallyMuted, [channel]: muted },
          })),

        setNewestStream: (newestStream) => set({ newestStream }),

        setSelectedChat: (selectedChat) => set({ selectedChat }),

        setViewMode: (viewMode) => set({ viewMode }),

        toggleViewMode: () =>
          set(({ viewMode }) => ({
            viewMode: viewMode === "focused" ? "grid" : "focused",
          })),

        setUpdateShown: (updateShown) => set({ updateShown }),

        toggleUpdateShown: () =>
          set((state) => ({ updateShown: !state.updateShown })),

        setSettingsShown: (settingsShown) => set({ settingsShown }),

        toggleSettingsShown: () =>
          set((state) => ({ settingsShown: !state.settingsShown })),

        toggleNopixel: () =>
          set((state) => ({ nopixelShown: !state.nopixelShown })),

        setChat: (chatShown) => set({ chatShown }),

        toggleChat: () => set((state) => ({ chatShown: !state.chatShown })),
      },
    })),
  ),
);
