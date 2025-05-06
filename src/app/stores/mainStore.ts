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
import { type Rect } from "../utils/layoutCells";

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

type ContainerSize = { width: number; height: number };

export interface MainState {
  initialised: boolean;

  streams: Stream[];
  streamsOrdered: Stream[];
  streamsMap: Record<string, Stream>;
  streamPositions: Record<string, number>;
  streamPlayer: Record<string, AnyPlayer>;
  streamCells: Record<string, Rect>;
  manuallyMuted: Record<string, boolean>;
  newestStream: string;
  selectedChat: string;

  viewMode: ViewMode;
  hasManuallyToggledView: boolean;

  focusHeightAuto: boolean;
  focusHeight: number;

  containerSize: ContainerSize | undefined;

  updateShown: boolean;
  settingsShown: boolean;
  nopixelShown: boolean;
  chatShown: boolean;
  isResizing: boolean;
  isChatResizing: boolean;

  // Drag state
  isDragging: boolean;
  dragChannel: string | null;
  dragStartX: number;
  dragStartY: number;
  dragCurrentX: number;
  dragCurrentY: number;

  actions: {
    markInitialised: () => void;

    setStreams: (
      streams: Stream[],
      streamPositions?: MainState["streamPositions"],
    ) => void;
    setStreamPositions: (streamPositions: MainState["streamPositions"]) => void;
    cycleStreams: () => void;
    setStreamPlayer: (channel: string, player: AnyPlayer) => void;
    setStreamCells: (cells: Rect[]) => void;
    setManuallyMuted: (channel: string, muted: boolean) => void;
    setNewestStream: (newestStream: string) => void;
    setSelectedChat: (selectedChat: string) => void;

    setViewMode: (viewMode: ViewMode) => void;
    toggleViewMode: () => void;

    setFocusHeight: (value: number, isAuto?: boolean) => void;

    setContainerSize: (size: ContainerSize) => void;

    setUpdateShown: (updateShown: boolean) => void;
    toggleUpdateShown: () => void;
    setSettingsShown: (shown: boolean) => void;
    toggleSettingsShown: () => void;
    toggleNopixel: () => void;
    setChat: (chatShown: boolean) => void;
    toggleChat: () => void;
    setIsResizing: (isResizing: boolean) => void;
    setIsChatResizing: (isChatResizing: boolean) => void;

    setDragState: (
      newState: Partial<
        Pick<
          MainState,
          | "isDragging"
          | "dragChannel"
          | "dragStartX"
          | "dragStartY"
          | "dragCurrentX"
          | "dragCurrentY"
        >
      >,
    ) => void;

    // New action to trigger fullscreen for a specific player
    forcePlayerFullscreen: (channel: string) => void;

    // New action to reload all streams
    reloadAllStreams: () => void;
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
      streamCells: {},
      manuallyMuted: {},
      newestStream: "",
      selectedChat: "",

      viewMode: "focused",
      hasManuallyToggledView: false,

      focusHeightAuto: true,
      focusHeight: 63,

      containerSize: undefined,

      updateShown: false,
      settingsShown: false,
      nopixelShown: false,
      chatShown: true,
      isResizing: false,
      isChatResizing: false,

      // Drag state initial values
      isDragging: false,
      dragChannel: null,
      dragStartX: 0,
      dragStartY: 0,
      dragCurrentX: 0,
      dragCurrentY: 0,

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
              streamCells: fromNewChannels(channels, state.streamCells),
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
              focusHeightAuto:
                streams.length !== state.streams.length
                  ? true
                  : state.focusHeightAuto,
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

        setStreamCells: (cells) => {
          const streamCells = Object.assign(
            {},
            ...get().streamsOrdered.map(({ value }, i) => ({
              [value]: cells[i],
            })),
          ) as Record<string, Rect>;

          if (
            JSON.stringify(streamCells) === JSON.stringify(get().streamCells)
          ) {
            return;
          }

          set({ streamCells });
        },

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

        setFocusHeight: (focusHeight, isAuto = get().focusHeightAuto) => {
          if (
            focusHeight === get().focusHeight &&
            isAuto === get().focusHeightAuto
          ) {
            return;
          }
          set((state) => ({
            focusHeight:
              focusHeight && !Number.isNaN(focusHeight)
                ? Number(focusHeight)
                : state.focusHeight,
            focusHeightAuto: isAuto,
          }));
        },

        setContainerSize: (containerSize) => {
          const currentContainerSize = get().containerSize;
          if (
            containerSize.width === currentContainerSize?.width &&
            containerSize.height === currentContainerSize?.height
          ) {
            return;
          }
          set({ containerSize });
        },

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

        setIsResizing: (isResizing) => set({ isResizing }),

        setIsChatResizing: (isChatResizing) => set({ isChatResizing }),

        setDragState: (newState) => set(newState),

        forcePlayerFullscreen: (channel: string) => {
          const { streamPlayer } = get();
          const player = streamPlayer[channel];

          if (player) {
            // For Twitch players, they might have a setFullscreen method
            // if (
            //   "getPlaybackStats" in player
            // ) {
            //   log("Twitch native fullscreen", channel);
            //   player.setFullscreen(true);
            //   return;
            // }

            // As a fallback, find the iframe and request fullscreen
            const playerElement = document.querySelector(
              `iframe[src*="channel=${channel}"]`,
            );
            if (playerElement instanceof HTMLElement) {
              if (playerElement.requestFullscreen) {
                log("IFrame fullscreen", channel);
                playerElement.requestFullscreen().catch((err) => {
                  console.error(
                    `Error attempting to enable fullscreen: ${err.message}`,
                  );
                });
              }
            }
          }
        },

        reloadAllStreams: () => {
          const { streamPlayer, streams } = get();
          log("[MainStore] Reloading all streams");
          streams.forEach((stream) => {
            const player = streamPlayer[stream.value];
            if (player && "setChannel" in player) {
              log("[MainStore] Reloading stream:", stream.value);
              player.setChannel(stream.value);
            }
          });
        },
      },
    })),
  ),
);
