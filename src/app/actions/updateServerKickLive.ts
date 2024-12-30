"use server";

import { type RemoteKickLivestream } from "../../types";
import { setKickStreams } from "../utils/getStreams";

export const updateServerKickLive = async (
  kickStreams: RemoteKickLivestream[],
) => {
  const received = await setKickStreams(kickStreams, true);

  return received;
};
