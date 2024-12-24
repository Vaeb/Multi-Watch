"use server";

import { getParsedNopixelData } from "../utils/getParsedNopixelData";

export const hydrateNopixelData = async () => {
  const parsed = await getParsedNopixelData();

  return parsed;
};
