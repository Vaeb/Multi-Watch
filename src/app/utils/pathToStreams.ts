import { type Platform } from "~/types";
import { type Stream } from "../stores/mainStore";

export const pathToStreams = (pathname: string): Stream[] =>
  pathname
    .split("/")
    .filter(Boolean)
    .map((value) => {
      let type: Platform = "twitch";
      if (value.startsWith("k-")) {
        value = value.slice(2);
        type = "kick";
      }
      return { value, type };
    });
