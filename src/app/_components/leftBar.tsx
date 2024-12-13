import { MainBar } from "./mainBar";
import { NopixelBarWrapper } from "./nopixelBarWrapper";

export function LeftBar() {
  return (
    <div className="absolute z-10 flex h-[63%] max-h-[90vh] w-[60px]">
      <MainBar />
      <NopixelBarWrapper />
    </div>
  );
}
