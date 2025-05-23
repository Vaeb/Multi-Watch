"use server";

import { type RemoteReceived } from "../../types";
import { getStreams } from "../utils/getStreams";

// Client periodically makes a request to the server to return the latest data for live Kick and Twitch streams
export const hydrateStreams = async (): Promise<RemoteReceived> => {
  const received = await getStreams();

  return received;
};
