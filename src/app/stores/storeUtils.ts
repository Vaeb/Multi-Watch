import { type StateCreator } from "zustand";
import { log } from "../utils/log";

export const stateApplyLog =
  <T>(config: StateCreator<T, [], []>): any =>
  (set: any, get: any, api: any) =>
    config(
      (...args) => {
        log("[Store] Applying:", ...args);
        set(...args);
        log("[Store] New state:", get());
      },
      get,
      api,
    );
