import { useMainStore } from "../stores/mainStore";

export const orderStreams = (
  streams = useMainStore.getState().streams,
  streamPositions = useMainStore.getState().streamPositions,
) =>
  [...streams].sort(
    (a, b) =>
      (streamPositions[a.value] ?? Infinity) -
      (streamPositions[b.value] ?? Infinity),
  );
