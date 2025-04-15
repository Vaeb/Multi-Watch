"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { streamsToPath } from "../utils/streamsToPath";
import { orderStreams } from "../utils/orderStreams";
import { stateApplyLog } from "./storeUtils";
import { type Stream, type ViewMode } from "./storeTypes";
import { useKickStore } from "./kickStore";
import { log } from "../utils/log";
import { type TwitchPlayerInstance } from "react-twitch-embed";

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

interface KickPlayer {
  setChannel: (c: string) => void;
}

type AnyPlayer = TwitchPlayerInstance | KickPlayer;

export interface MainState {
  initialised: boolean;

  streams: Stream[];
  streamsOrdered: Stream[];
  streamsMap: Record<string, Stream>;
  streamPositions: Record<string, number>;
  streamPlayer: Record<string, AnyPlayer>;
  manuallyMuted: Record<string, boolean>;
  newestStream: string;
  selectedChat: string;

  viewMode: ViewMode;
  hasManuallyToggledView: boolean;

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
    setStreamPositions: (streamPositions: MainState["streamPositions"]) => void;
    cycleStreams: () => void;
    setStreamPlayer: (channel: string, player: AnyPlayer) => void;
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
    stateApplyLog<MainState>((set, get) => ({
      initialised: false,

      streams: [],
      streamsOrdered: [],
      streamsMap: {},
      streamPositions: {},
      streamPlayer: {},
      manuallyMuted: {},
      newestStream: "",
      selectedChat: "",

      viewMode: "focused",
      hasManuallyToggledView: false,

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
              ...streams.map((stream) => ({
                [stream.value.toLowerCase()]: stream,
              })),
            ) as Record<string, Stream>;

            const streamsOrdered = orderStreams(streams, streamPositions);

            log("setStreams", streams, streamsOrdered, streamPositions);

            return {
              streams,
              streamsOrdered,
              streamsMap,
              streamPositions:
                streamPositions ??
                (Object.assign(
                  {},
                  ...streamsOrdered.map(({ value }, i) => ({
                    [value]: i,
                  })),
                ) as Record<string, number>),
              streamPlayer: fromNewChannels(channels, state.streamPlayer),
              manuallyMuted: fromNewChannels(channels, state.manuallyMuted),
              newestStream: streamsMap[state.newestStream?.toLowerCase() ?? ""]
                ? state.newestStream
                : "",
              selectedChat: streamsMap[state.selectedChat?.toLowerCase() ?? ""]
                ? state.selectedChat
                : "",
              viewMode: state.hasManuallyToggledView
                ? state.viewMode
                : streams.length >= 5
                  ? "grid"
                  : "focused",
            };
          });

          useKickStore.getState().actions.syncChannels(channels);
        },

        setStreamPositions: (streamPositions) =>
          set((state) => {
            const { streams } = state;

            const streamsOrdered = orderStreams(streams, streamPositions);

            window.history.pushState(
              {},
              "",
              streamsToPath(streams, streamPositions),
            );

            return { streamsOrdered, streamPositions };
          }),

        cycleStreams: () => {
          const { streamPositions: streamPositionsBase, actions } = get();
          const entries = Object.entries(streamPositionsBase);
          const streamPositions = Object.assign(
            {},
            ...entries.map(([channel, pos]) => ({
              [channel]: (pos + 1) % entries.length,
            })),
          );

          actions.setStreamPositions(streamPositions);
        },

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
            hasManuallyToggledView: true,
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
