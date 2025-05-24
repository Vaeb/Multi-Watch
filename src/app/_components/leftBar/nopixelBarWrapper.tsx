import { memo } from "react";
import { NopixelBarWithData } from "./nopixelBarWithData";
import { getStreams } from "../../utils/getStreams";
import { log } from "~/app/utils/log";

async function NopixelBarWrapperComponent() {
  const receivedData = await getStreams();

  log("[NopixelBarWrapper] initial", receivedData.needsKickLiveStreams);

  return <NopixelBarWithData receivedData={receivedData} />;
}

export const NopixelBarWrapper = memo(NopixelBarWrapperComponent);
