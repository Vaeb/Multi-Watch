import { type Platform } from "~/types";
import { streamsToPath } from "./streamsToPath";
import { useMainStore } from "../stores/mainStore";
import { type Stream } from "../stores/storeTypes";

export const addStream = (channel: string, type: Platform = "twitch") => {
  const {
    streams: _streams,
    actions: { setStreams, setNewestStream, setSelectedChat },
  } = useMainStore.getState();

  const streams: Stream[] = [..._streams, { value: channel, type }];

  const newPathname = streamsToPath(streams);
  window.history.pushState({}, "", newPathname);

  setStreams(streams);
  setNewestStream(channel);
  setSelectedChat(channel);
};
