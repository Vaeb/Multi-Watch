"use client";

import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import { stateApplyLog } from "./storeUtils";
import { type Autoplay, type GridMode } from "./storeTypes";
import { type Platform } from "~/types";

export type FavoriteKey = `${Platform}:${string}`;

export interface PersistState {
  gridMode: GridMode;
  autoplay: Autoplay;
  chatWidth: number;
  hideLeftBar: boolean;
  favorites: FavoriteKey[];

  actions: {
    resetDefaults: () => void;
    setGridMode: (gridMode: GridMode) => void;
    setAutoplay: (autoplay: Autoplay) => void;
    setChatWidth: (value: number) => void;
    setHideLeftBar: (value: boolean) => void;
    toggleFavorite: (platform: Platform, channel: string) => void;
  };
}

// Settings restored by resetDefaults. Favorites are user data, so they are deliberately not included.
export const persistDefaults = {
  gridMode: "normal",
  autoplay: "all",
  chatWidth: 470,
  hideLeftBar: false,
} as const satisfies Partial<PersistState>;

export const favoriteKey = (platform: Platform, channel: string): FavoriteKey =>
  `${platform}:${channel.toLowerCase()}`;

export const isFavorite =
  (platform: Platform, channel: string) =>
  (state: Pick<PersistState, "favorites">) =>
    state.favorites.includes(favoriteKey(platform, channel));

export const usePersistStore = create<PersistState>()(
  subscribeWithSelector(
    persist(
      stateApplyLog<PersistState>((set) => ({
        ...persistDefaults,
        favorites: [],

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
          setHideLeftBar: (hideLeftBar) => set({ hideLeftBar }),
          toggleFavorite: (platform, channel) =>
            set((state) => {
              const key = favoriteKey(platform, channel);
              return {
                favorites: state.favorites.includes(key)
                  ? state.favorites.filter((fav) => fav !== key)
                  : [...state.favorites, key],
              };
            }),
        },
      })),
      {
        name: "vaeb-multi-persist-storage",
        partialize: (state) =>
          Object.fromEntries(
            Object.entries(state).filter(([key]) => key !== "actions"),
          ),
        // Saved state from before favorites existed (or a corrupted value) falls back to the default list
        merge: (persisted, current) => {
          const saved = (persisted ?? {}) as Partial<PersistState>;
          return {
            ...current,
            ...saved,
            favorites: Array.isArray(saved.favorites)
              ? saved.favorites.filter(
                  (fav): fav is FavoriteKey => typeof fav === "string",
                )
              : current.favorites,
          };
        },
      },
    ),
  ),
);
