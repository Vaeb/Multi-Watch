import { create, type StateCreator } from "zustand";
import { type Platform } from "~/types";

export interface Stream {
  value: string;
  type: Platform;
}

export interface MainState {
  streams: Stream[];
  newestStream: string;

  updateShown: boolean;

  actions: {
    setStreams: (streams: Stream[]) => void;
    setNewestStream: (newestStream: string) => void;
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

export const useMainStore = create<MainState>(
  log((set) => ({
    streams: [],
    newestStream: "",

    updateShown: false,

    actions: {
      setStreams: (streams) => set({ streams }),
      setNewestStream: (newestStream) => set({ newestStream }),

      setUpdateShown: (updateShown) => set({ updateShown }),
      toggleUpdateShown: () =>
        set((state) => ({ updateShown: !state.updateShown })),
    },
  })),
);
