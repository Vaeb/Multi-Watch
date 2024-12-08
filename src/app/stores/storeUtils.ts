import { type StateCreator } from "zustand";

export const log =
  <T>(config: StateCreator<T, [], []>): any =>
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
