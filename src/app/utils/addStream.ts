import { type Platform } from "~/types";
import { streamsToPath } from "./streamsToPath";
import { useMainStore } from "../stores/mainStore";
import { type Stream } from "../stores/storeTypes";

export const addStream = (channel: string, type: Platform = "twitch") => {
  const {
    streams: _streams,
    streamsMap,
    actions: { setStreams, setNewestStream, setSelectedChat },
  } = useMainStore.getState();

  // Check if stream already exists (case insensitive)
  const channelLower = channel.toLowerCase();
  const existingStream = streamsMap[channelLower];
  if (existingStream && existingStream.type === type) {
    // If it exists, just update newest and selected stream
    setNewestStream(channel);
    setSelectedChat(channel);
    return;
  }

  const streams: Stream[] = [..._streams];
  if (existingStream) {
    const streamIndex = streams.findIndex((s) => s.value === channel);
    streams[streamIndex] = { value: channel, type };
  } else {
    streams.push({ value: channel, type });
  }

  const newPathname = streamsToPath(streams);
  window.history.pushState({}, "", newPathname);

  setStreams(streams);
  setNewestStream(channel);
  setSelectedChat(channel);
};
