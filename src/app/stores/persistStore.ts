"use client";

import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import { stateApplyLog } from "./storeUtils";
import { type Autoplay, type GridMode } from "./storeTypes";
import { type Platform } from "~/types";
import { favoriteKey, type FavoriteKey } from "../utils/favorites";

export { favoriteKey, type FavoriteKey };

export interface PersistState {
  gridMode: GridMode;
  autoplay: Autoplay;
  chatWidth: number;
  hideLeftBar: boolean;
  defaultToFavorites: boolean;
  favorites: FavoriteKey[];
  favoriteFactions: string[];

  actions: {
    resetDefaults: () => void;
    setGridMode: (gridMode: GridMode) => void;
    setAutoplay: (autoplay: Autoplay) => void;
    setChatWidth: (value: number) => void;
    setHideLeftBar: (value: boolean) => void;
    setDefaultToFavorites: (value: boolean) => void;
    toggleFavorite: (platform: Platform, channel: string) => void;
    toggleFavoriteFaction: (faction: string) => void;
  };
}

// Settings restored by resetDefaults. Favorites are user data, so they are deliberately not included.
export const persistDefaults = {
  gridMode: "normal",
  autoplay: "all",
  chatWidth: 470,
  hideLeftBar: false,
  defaultToFavorites: false,
} as const satisfies Partial<PersistState>;

export const isFavorite =
  (platform: Platform, channel: string) =>
  (state: Pick<PersistState, "favorites">) =>
    state.favorites.includes(favoriteKey(platform, channel));

export const isFavoriteFaction =
  (faction: string) => (state: Pick<PersistState, "favoriteFactions">) =>
    state.favoriteFactions.includes(faction);

const savedStringList = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : null;

export const usePersistStore = create<PersistState>()(
  subscribeWithSelector(
    persist(
      stateApplyLog<PersistState>((set) => ({
        ...persistDefaults,
        favorites: [],
        favoriteFactions: [],

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
          setDefaultToFavorites: (defaultToFavorites) =>
            set({ defaultToFavorites }),
          toggleFavorite: (platform, channel) =>
            set((state) => {
              const key = favoriteKey(platform, channel);
              return {
                favorites: state.favorites.includes(key)
                  ? state.favorites.filter((fav) => fav !== key)
                  : [...state.favorites, key],
              };
            }),
          toggleFavoriteFaction: (faction) =>
            set((state) => ({
              favoriteFactions: state.favoriteFactions.includes(faction)
                ? state.favoriteFactions.filter((fav) => fav !== faction)
                : [...state.favoriteFactions, faction],
            })),
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
            favorites:
              (savedStringList(saved.favorites) as FavoriteKey[] | null) ??
              current.favorites,
            favoriteFactions:
              savedStringList(saved.favoriteFactions) ??
              current.favoriteFactions,
            defaultToFavorites:
              typeof saved.defaultToFavorites === "boolean"
                ? saved.defaultToFavorites
                : current.defaultToFavorites,
          };
        },
      },
    ),
  ),
);
