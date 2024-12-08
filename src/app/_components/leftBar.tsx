"use client";

import Image from "next/image";
import { type MainState, useMainStore } from "../stores/mainStore";

const selector = (state: MainState) => state.actions;
const selector2 = (state: MainState) => state.viewMode;

interface LeftBarButtonProps {
  imageUrl: string;
  alt: string;
  onClick: (...args: any[]) => any;
}

const LeftBarButton = ({ imageUrl, alt, onClick }: LeftBarButtonProps) => {
  return (
    <div className="flex h-[60px] items-center justify-center">
      <button
        className="h-[42px] opacity-40 hover:opacity-100"
        onClick={onClick}
      >
        <Image src={imageUrl} width={42} height={42} alt={alt} />
      </button>
    </div>
  );
};

export function LeftBar() {
  const { toggleUpdateShown, cycleStreams, toggleViewMode } =
    useMainStore(selector);
  const viewMode = useMainStore(selector2);

  return (
    <div className="absolute z-10 flex h-[50%] w-[60px] flex-col gap-3">
      <LeftBarButton
        imageUrl="/Edit_Profile.svg"
        alt="Update streams"
        onClick={toggleUpdateShown}
      />
      <LeftBarButton
        imageUrl={viewMode === "focused" ? "/squares2.png" : "/rectangle1.png"}
        alt="Switch to grid"
        onClick={toggleViewMode}
      />
      <LeftBarButton
        imageUrl="/cycle.svg"
        alt="Rotate streams"
        onClick={cycleStreams}
      />
    </div>
  );
}
