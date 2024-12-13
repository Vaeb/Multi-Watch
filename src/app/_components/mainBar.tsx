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
  message: string;
  onClick: (...args: any[]) => any;
  style?: any;
  children?: React.ReactElement;
}

const LeftBarButton = ({
  imageUrl,
  message,
  onClick,
  children,
  style,
}: LeftBarButtonProps) => {
  return (
    <div className="flex h-[60px] items-center justify-center">
      <button
        className="group flex h-[42px] items-center gap-3 whitespace-nowrap"
        onClick={onClick}
      >
        <div className="w-[42px] opacity-50 group-hover:opacity-100">
          {children ?? (
            <Image
              style={style}
              src={imageUrl!}
              width={42}
              height={42}
              alt={message}
            />
          )}
        </div>
        <p>{message}</p>
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
        message="Update streams"
        onClick={toggleUpdateShown}
      />
      <LeftBarButton
        imageUrl="/np3.png"
        message="View NoPixel streams"
        onClick={toggleNopixelCb}
      />
      <LeftBarButton
        imageUrl={viewMode === "focused" ? "/squares2.png" : "/rectangle1.png"}
        message={viewMode === "focused" ? "Switch to grid" : "Switch to focus"}
        onClick={toggleViewMode}
      />
      <LeftBarButton
        imageUrl="/cycle2.svg"
        message="Rotate streams"
        onClick={cycleStreams}
      />
    </div>
  );
}
