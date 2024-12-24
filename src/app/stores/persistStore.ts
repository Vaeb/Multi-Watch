"use client";

import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import { log } from "./storeUtils";
import { type GridMode } from "./storeTypes";

export interface PersistState {
  gridMode: GridMode;

  actions: {
    resetDefaults: () => void;
    setGridMode: (gridMode: GridMode) => void;
  };
}

export const usePersistStore = create<PersistState>()(
  subscribeWithSelector(
    persist(
      log<PersistState>((set) => ({
        gridMode: "normal",

        actions: {
          resetDefaults: () => set({ gridMode: "normal" }),

          setGridMode: (gridMode) => set({ gridMode }),
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
