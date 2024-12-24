"use server";

import { type RemoteReceived } from "../../types";
import { getParsedNopixelData } from "../utils/getParsedNopixelData";

export const hydrateNopixelData = async (): Promise<RemoteReceived> => {
  const received = await getParsedNopixelData();

  return received;
};
