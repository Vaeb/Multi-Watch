"use server";

import { type RemoteReceived } from "../../types";
import { getStreams } from "../utils/getStreams";

export const hydrateStreams = async (): Promise<RemoteReceived> => {
  const received = await getStreams();

  return received;
};
