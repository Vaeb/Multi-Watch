"use client";

import Image from "next/image";
import { type MainState, useMainStore } from "../stores/mainStore";
import { NopixelBar } from "./nopixelBar";
import { useCallback } from "react";
import { ViewMode } from "../stores/storeTypes";

const selector = (state: MainState) => state.actions;
const selector2 = (state: MainState) => state.nopixelShown;
const selector3 = (state: MainState) => state.viewMode;
const selector4 = (state: MainState) => state.chatShown;

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

const nextViewImage = {
  focused: "/rectangle1.png",
  grid: "/squares2.png",
  "grid-h": "/squaresH.png",
};

const nextViewText: Record<ViewMode, string> = {
  focused: "Switch to focus",
  grid: "Switch to grid",
  "grid-h": "Switch to horizontal grid",
};

export function MainBar() {
  const {
    toggleUpdateShown,
    cycleStreams,
    toggleViewMode,
    toggleNopixel,
    setUpdateShown,
    toggleChat,
  } = useMainStore(selector);
  const nopixelShown = useMainStore(selector2);
  const viewMode = useMainStore(selector3);
  const chatShown = useMainStore(selector4);

  const toggleNopixelCb = useCallback(() => {
    toggleNopixel();
    setUpdateShown(false);
  }, [toggleNopixel, setUpdateShown]);

  const nextViewMode: ViewMode =
    viewMode === "focused"
      ? "grid"
      : viewMode === "grid"
        ? "grid-h"
        : "focused";

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
        imageUrl={nextViewImage[nextViewMode]}
        message={nextViewText[nextViewMode]}
        onClick={toggleViewMode}
      />
      <LeftBarButton
        imageUrl="/cycle2.svg"
        message="Rotate streams"
        onClick={cycleStreams}
      />
      <LeftBarButton
        imageUrl="/chat3.png"
        message={chatShown ? "Hide chat" : "Show chat"}
        onClick={toggleChat}
      />
    </div>
  );
}
