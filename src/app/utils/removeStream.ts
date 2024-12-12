import { type Platform } from "~/types";
import { streamsToPath } from "./streamsToPath";
import { useMainStore } from "../stores/mainStore";
import { type Stream } from "../stores/storeTypes";

export const removeStream = (channel: string, type: Platform) => {
  const {
    streams: _streams,
    actions: { setStreams },
  } = useMainStore.getState();

  const streams: Stream[] = _streams.filter(
    (stream) => stream.value !== channel || stream.type !== type,
  );

  const newPathname = streamsToPath(streams);
  window.history.pushState({}, "", newPathname);

  setStreams(streams);
};
