"use client";

import Image from "next/image";
import { type MainState, useMainStore } from "../stores/mainStore";
import { NopixelBar } from "./nopixelBar";
import { useCallback } from "react";

const selector = (state: MainState) => state.actions;
const selector2 = (state: MainState) => state.nopixelShown;
const selector3 = (state: MainState) => state.viewMode;

interface LeftBarButtonProps {
  imageUrl?: string;
  alt?: string;
  onClick: (...args: any[]) => any;
  style?: any;
  children?: React.ReactElement;
}

const LeftBarButton = ({
  imageUrl,
  alt,
  onClick,
  children,
  style,
}: LeftBarButtonProps) => {
  return (
    <div className="flex h-[60px] items-center justify-center">
      <button
        className="h-[42px] opacity-50 hover:opacity-100"
        onClick={onClick}
      >
        {children ?? (
          <Image
            style={style}
            src={imageUrl!}
            width={42}
            height={42}
            alt={alt!}
          />
        )}
      </button>
    </div>
  );
};

export function MainBar() {
  const {
    toggleUpdateShown,
    cycleStreams,
    toggleViewMode,
    toggleNopixel,
    setUpdateShown,
  } = useMainStore(selector);
  const nopixelShown = useMainStore(selector2);
  const viewMode = useMainStore(selector3);

  const toggleNopixelCb = useCallback(() => {
    toggleNopixel();
    setUpdateShown(false);
  }, [toggleNopixel, setUpdateShown]);

  return (
    <div
      className={`flex w-full flex-col items-start gap-[6px] ${nopixelShown ? "invisible absolute" : ""}`}
    >
      <LeftBarButton
        imageUrl="/Edit_Profile.svg"
        alt="Update streams"
        onClick={toggleUpdateShown}
      />
      <LeftBarButton
        imageUrl="/np3.png"
        alt="Live NoPixel streams"
        onClick={toggleNopixelCb}
      />
      <LeftBarButton
        imageUrl={viewMode === "focused" ? "/squares2.png" : "/rectangle1.png"}
        alt="Switch to grid"
        onClick={toggleViewMode}
      />
      <LeftBarButton
        imageUrl="/cycle2.svg"
        alt="Rotate streams"
        onClick={cycleStreams}
      />
    </div>
  );
}
