"use client";

import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import { stateApplyLog } from "./storeUtils";
import { type Autoplay, type GridMode } from "./storeTypes";

export interface PersistState {
  gridMode: GridMode;
  autoplay: Autoplay;
  focusHeight: number;

  actions: {
    resetDefaults: () => void;
    setGridMode: (gridMode: GridMode) => void;
    setAutoplay: (autoplay: Autoplay) => void;
    setFocusHeight: (value: number) => void;
  };
}

export const usePersistStore = create<PersistState>()(
  subscribeWithSelector(
    persist(
      stateApplyLog<PersistState>((set) => ({
        gridMode: "normal",
        autoplay: "all",
        focusHeight: 63,

        actions: {
          resetDefaults: () =>
            set({ gridMode: "normal", autoplay: "all", focusHeight: 63 }),

          setGridMode: (gridMode) => set({ gridMode }),
          setAutoplay: (autoplay) => set({ autoplay }),
          setFocusHeight: (focusHeight) => set({ focusHeight }),
        },
      })),
      {
        name: "vaeb-multi-persist-storage",
        partialize: (state) =>
          Object.fromEntries(
            Object.entries(state).filter(([key]) => key !== "actions"),
          ),
      },
    ),
  ),
);
