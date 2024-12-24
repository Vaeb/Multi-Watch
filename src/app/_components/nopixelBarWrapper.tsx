import { memo } from "react";
import { NopixelBar } from "./nopixelBar";
import { getParsedNopixelData } from "../utils/getParsedNopixelData";

async function NopixelBarWrapperComponent() {
  const receivedData = await getParsedNopixelData();

  return <NopixelBar receivedData={receivedData} />;
}

export const NopixelBarWrapper = memo(NopixelBarWrapperComponent);
