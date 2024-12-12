"use client";

import Image from "next/image";
import { type MainState, useMainStore } from "../stores/mainStore";
import { NopixelBar } from "./nopixelBar";

const selector = (state: MainState) => state.actions;
const selector2 = (state: MainState) => state.nopixelShown;
const selector3 = (state: MainState) => state.viewMode;

interface LeftBarButtonProps {
  imageUrl: string;
  alt: string;
  onClick: (...args: any[]) => any;
  style?: any;
}

const LeftBarButton = ({
  imageUrl,
  alt,
  onClick,
  style,
}: LeftBarButtonProps) => {
  return (
    <div className="flex h-[60px] items-center justify-center">
      <button
        className="h-[42px] opacity-40 hover:opacity-100"
        onClick={onClick}
      >
        <Image style={style} src={imageUrl} width={42} height={42} alt={alt} />
      </button>
    </div>
  );
};

export function LeftBar({ children }: { children: React.ReactElement }) {
  const { toggleUpdateShown, cycleStreams, toggleViewMode, toggleNopixel } =
    useMainStore(selector);
  const nopixelShown = useMainStore(selector2);
  const viewMode = useMainStore(selector3);

  return (
    <>
      <div className={`${nopixelShown ? "" : "invisible"}`}>{children}</div>
      <div
        className={`absolute z-10 flex h-[50%] w-[60px] flex-col gap-[12px] ${nopixelShown ? "invisible" : ""}`}
      >
        <LeftBarButton
          imageUrl="/Edit_Profile.svg"
          alt="Update streams"
          onClick={toggleUpdateShown}
        />
        <LeftBarButton
          imageUrl="/np1.ico"
          alt="Live NoPixel streams"
          onClick={toggleNopixel}
        />
        <LeftBarButton
          imageUrl={
            viewMode === "focused" ? "/squares2.png" : "/rectangle1.png"
          }
          alt="Switch to grid"
          onClick={toggleViewMode}
        />
        <LeftBarButton
          imageUrl="/cycle.svg"
          alt="Rotate streams"
          onClick={cycleStreams}
        />
      </div>
    </>
  );
}
