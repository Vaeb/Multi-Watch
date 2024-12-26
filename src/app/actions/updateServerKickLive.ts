"use server";

import { type RemoteKickLivestream } from "../../types";
import { setKickStreams } from "../utils/getStreams";

export const updateServerKickLive = async (
  kickStreams: RemoteKickLivestream[],
) => {
  setKickStreams(kickStreams);
};
