import { memo } from "react";
import { NopixelBarWithData } from "./nopixelBarWithData";
import { getStreams } from "../../utils/getStreams";
import { type KickState } from "../../stores/kickStore";

async function NopixelBarWrapperComponent({
  chatrooms,
}: {
  chatrooms: KickState["chatrooms"];
}) {
  const receivedData = await getStreams();

  return (
    <NopixelBarWithData receivedData={receivedData} chatrooms={chatrooms} />
  );
}

export const NopixelBarWrapper = memo(NopixelBarWrapperComponent);
