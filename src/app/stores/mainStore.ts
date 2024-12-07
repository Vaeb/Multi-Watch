"use client";

import { create, type StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { type Platform } from "~/types";
import { streamsToPath } from "../utils/streamsToPath";
import { orderStreams } from "../utils/orderStreams";

export interface Stream {
  value: string;
  type: Platform;
}

export type ViewMode = "focused" | "grid";

const log =
  (config: StateCreator<MainState, [], []>): any =>
  (set: any, get: any, api: any) =>
    config(
      (...args) => {
        console.log("[Store] Applying:", ...args);
        set(...args);
        console.log("[Store] New state:", get());
      },
      get,
      api,
    );

export interface MainState {
  streams: Stream[];
  streamsMap: Record<string, Stream>;
  streamPositions: Record<string, number>;
  streamPlayer: Record<string, any>;
  manuallyMuted: Record<string, boolean>;
  newestStream: string;
  selectedChat: string;

  viewMode: ViewMode;

  updateShown: boolean;

  chatrooms: Record<string, number>;

  actions: {
    setStreams: (streams: Stream[]) => void;
    cycleStreams: () => void;
    setStreamPlayer: (channel: string, player: any) => void;
    setManuallyMuted: (channel: string, muted: boolean) => void;
    setNewestStream: (newestStream: string) => void;
    setSelectedChat: (selectedChat: string) => void;

    setViewMode: (viewMode: ViewMode) => void;
    toggleViewMode: () => void;

    setUpdateShown: (updateShown: boolean) => void;
    toggleUpdateShown: () => void;

    setChatrooms: (chatrooms: MainState["chatrooms"]) => void;
  };
}

export const useMainStore = create<MainState>()(
  subscribeWithSelector(
    log((set) => ({
      streams: [],
      streamsMap: {},
      streamPositions: {},
      streamPlayer: {},
      manuallyMuted: {},
      newestStream: "",
      selectedChat: "",

      viewMode: "focused",

      updateShown: false,

      chatrooms: {},

      actions: {
        setStreams: (streams) =>
          set((state) => {
            const streamsMap = Object.assign(
              {},
              ...streams.map((stream) => ({ [stream.value]: stream })),
            ) as Record<string, Stream>;

            return {
              streams,
              streamsMap,
              streamPositions: Object.assign(
                {},
                ...streams.map((stream, i) => ({ [stream.value]: i })),
              ) as Record<string, number>,
              streamPlayer: {},
              manuallyMuted: {},
              newestStream: streamsMap[state.newestStream]
                ? state.newestStream
                : "",
              selectedChat: streamsMap[state.selectedChat]
                ? state.selectedChat
                : "",
            };
          }),
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
              streamsToPath(orderStreams(streams, streamPositions)),
            );

            return { streamPositions };
          }),
        setStreamPlayer: (channel, player) =>
          set((state) => ({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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

        setChatrooms: (chatrooms) => set({ chatrooms }),
      },
    })),
  ),
);
