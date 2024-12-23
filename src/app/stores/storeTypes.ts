import { type Platform } from "~/types";

export interface Stream {
  value: string;
  type: Platform;
}

export type ViewMode = "focused" | "grid" | "grid-h";
