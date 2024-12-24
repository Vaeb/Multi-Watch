import { memo } from "react";
import { NopixelBar } from "./nopixelBar";
import { getParsedNopixelData } from "../utils/getParsedNopixelData";

async function NopixelBarWrapperComponent() {
  const parsed = await getParsedNopixelData();

  return <NopixelBar parsedData={parsed} />;
}

export const NopixelBarWrapper = memo(NopixelBarWrapperComponent);
