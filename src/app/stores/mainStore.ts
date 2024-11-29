import { create, type StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { type Platform } from "~/types";

export interface Stream {
  value: string;
  type: Platform;
}

export interface MainState {
  streams: Stream[];
  streamsMap: Record<string, Stream>;
  streamPlayer: Record<string, any>;
  manuallyMuted: Record<string, boolean>;
  newestStream: string;
  selectedChat: string;

  updateShown: boolean;

  actions: {
    setStreams: (streams: Stream[]) => void;
    setStreamPlayer: (channel: string, player: any) => void;
    setManuallyMuted: (channel: string, muted: boolean) => void;
    setNewestStream: (newestStream: string) => void;
    setSelectedChat: (selectedChat: string) => void;
    setUpdateShown: (updateShown: boolean) => void;
    toggleUpdateShown: () => void;
  };
}

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

export const useMainStore = create<MainState>()(
  subscribeWithSelector(
    log((set) => ({
      streams: [],
      streamsMap: {},
      streamPlayer: {},
      manuallyMuted: {},
      newestStream: "",
      selectedChat: "",

      updateShown: false,

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

        setUpdateShown: (updateShown) => set({ updateShown }),
        toggleUpdateShown: () =>
          set((state) => ({ updateShown: !state.updateShown })),
      },
    })),
  ),
);
