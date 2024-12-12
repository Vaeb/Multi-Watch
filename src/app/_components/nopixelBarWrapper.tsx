import { memo } from "react";
import { NopixelBar, type RemoteLive } from "./nopixelBar";

const getData = async () => {
  const dataRaw = await fetch("http://localhost:3029/live");
  const data = await dataRaw.json();
  console.log("[getData]", Object.keys(data));
  return data as RemoteLive;
};

async function NopixelBarWrapperComponent() {
  const data = await getData();

  return <NopixelBar data={data} />;
}

export const NopixelBarWrapper = memo(NopixelBarWrapperComponent);
