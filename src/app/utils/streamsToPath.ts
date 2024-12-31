import { useMainStore } from "../stores/mainStore";
import { orderStreams } from "./orderStreams";

export const streamsToPath = (
  streams = useMainStore.getState().streams,
  streamPositions = useMainStore.getState().streamPositions,
) =>
  `/${orderStreams(streams, streamPositions)
    .map(({ value, type }) => `${value}${type === "kick" ? "-k" : ""}`)
    .join("/")}`;
