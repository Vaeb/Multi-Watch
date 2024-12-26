"use server";

import { log } from "../utils/log";

export const requestChatroom = async (channel: string) => {
  log("[requestChatroom] Requesting", channel);
  return 111;
};
