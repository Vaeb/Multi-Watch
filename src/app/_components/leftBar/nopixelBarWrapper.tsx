import { memo } from "react";
import { NopixelBar } from "./nopixelBar";
import { getStreams } from "../../utils/getStreams";
import { type KickState } from "../../stores/kickStore";

async function NopixelBarWrapperComponent({
  chatrooms,
}: {
  chatrooms: KickState["chatrooms"];
}) {
  const receivedData = await getStreams();

  return <NopixelBar receivedData={receivedData} chatrooms={chatrooms} />;
}

export const NopixelBarWrapper = memo(NopixelBarWrapperComponent);
