import { memo } from "react";
import { NopixelBarWithData } from "./nopixelBarWithData";
import { getStreams } from "../../utils/getStreams";

async function NopixelBarWrapperComponent() {
  const receivedData = await getStreams();

  return <NopixelBarWithData receivedData={receivedData} />;
}

export const NopixelBarWrapper = memo(NopixelBarWrapperComponent);
