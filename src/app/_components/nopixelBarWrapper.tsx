import { memo } from "react";
import { NopixelBar } from "./nopixelBar";
import { getStreams } from "../utils/getStreams";
import { type KickState } from "../stores/kickStore";
import { MainBar } from "./mainBar";

async function NopixelBarWrapperComponent({
  chatrooms,
}: {
  chatrooms: KickState["chatrooms"];
}) {
  const receivedData = await getStreams();

  return (
    <MainBar>
      <NopixelBar receivedData={receivedData} chatrooms={chatrooms} />
    </MainBar>
  );
}

export const NopixelBarWrapper = memo(NopixelBarWrapperComponent);
