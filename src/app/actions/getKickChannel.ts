"use server";

import { type GlobalData } from "../../types";
import { ensureKickSnapshot } from "../utils/getStreams";
import { kickChannelView, type KickChannelView } from "../utils/kickOnDemand";

const globalData = global as GlobalData;

export const getKickChannel = async (
  channel: string,
): Promise<KickChannelView> => {
  await ensureKickSnapshot();
  return kickChannelView(channel.trim(), globalData.cachedKickStreams);
};
