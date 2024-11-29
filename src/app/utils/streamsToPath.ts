import { useMainStore } from "../stores/mainStore";

export const streamsToPath = (streams = useMainStore.getState().streams) =>
  `/${streams
    .map(({ value, type }) => `${value}${type === "kick" ? "-k" : ""}`)
    .join("/")}`;
