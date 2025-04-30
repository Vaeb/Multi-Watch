"use client";

import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import { stateApplyLog } from "./storeUtils";
import { type Autoplay, type GridMode } from "./storeTypes";

export interface PersistState {
  gridMode: GridMode;
  autoplay: Autoplay;
  chatWidth: number;

  actions: {
    resetDefaults: () => void;
    setGridMode: (gridMode: GridMode) => void;
    setAutoplay: (autoplay: Autoplay) => void;
    setChatWidth: (value: number) => void;
  };
}

export const persistDefaults = {
  gridMode: "normal",
  autoplay: "all",
  chatWidth: 470,
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
          setChatWidth: (chatWidth) =>
            set((state) => ({
              chatWidth:
                chatWidth && !Number.isNaN(chatWidth)
                  ? Number(chatWidth)
                  : state.chatWidth,
            })),
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
