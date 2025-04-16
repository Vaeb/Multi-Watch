"use client";

import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import { stateApplyLog } from "./storeUtils";
import { type Autoplay, type GridMode } from "./storeTypes";

export interface PersistState {
  gridMode: GridMode;
  autoplay: Autoplay;
  focusHeight: number;
  chatWidth: number;
  isResizing: boolean;

  actions: {
    resetDefaults: () => void;
    setGridMode: (gridMode: GridMode) => void;
    setAutoplay: (autoplay: Autoplay) => void;
    setChatWidth: (value: number) => void;
    setFocusHeight: (value: number) => void;
    setIsResizing: (isResizing: boolean) => void;
  };
}

export const persistDefaults = {
  gridMode: "normal",
  autoplay: "all",
  focusHeight: 63,
  chatWidth: 470,
  isResizing: false,
} as const satisfies Partial<PersistState>;

export const usePersistStore = create<PersistState>()(
  subscribeWithSelector(
    persist(
      stateApplyLog<PersistState>((set) => ({
        ...persistDefaults,

        actions: {
          resetDefaults: () => set({ ...persistDefaults }),

          setGridMode: (gridMode) => set({ gridMode }),
          setAutoplay: (autoplay) => set({ autoplay }),
          setFocusHeight: (focusHeight) => set({ focusHeight }),
          setChatWidth: (chatWidth) => set({ chatWidth }),
          setIsResizing: (isResizing) => set({ isResizing }),
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
