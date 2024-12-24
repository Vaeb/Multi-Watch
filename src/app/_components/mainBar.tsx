"use client";

import Image from "next/image";
import { type MainState, useMainStore } from "../stores/mainStore";
import { useCallback } from "react";
import { type GridMode } from "../stores/storeTypes";
import { type PersistState, usePersistStore } from "../stores/persistStore";

const selector = (state: MainState) => state.actions;
const selector2 = (state: MainState) => state.nopixelShown;
const selector3 = (state: MainState) => state.viewMode;
const selectorGrid = (state: PersistState) => state.gridMode;
const selector4 = (state: MainState) => state.chatShown;

interface LeftBarButtonProps {
  imageUrl?: string;
  message: string;
  onClick: (...args: any[]) => any;
  style?: any;
  children?: React.ReactElement;
}

interface LeftBarTextProps {
  message: string;
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
        className="group/btn flex h-[42px] items-center gap-3 whitespace-nowrap"
        onClick={onClick}
      >
        <div className="w-[42px] opacity-50 group-hover/btn:opacity-100">
          {children ?? (
            <Image
              style={style}
              src={imageUrl!}
              width={40}
              height={40}
              alt={message}
            />
          )}
        </div>
        <p>{message}</p>
      </button>
    </div>
  );
};

const LeftBarText = ({ message }: LeftBarTextProps) => {
  return (
    <div className="flex h-[60px] items-center justify-center">
      <div className="ml-[6px] flex h-[42px] gap-3 text-left text-sm">
        <p className="absolute whitespace-nowrap opacity-65 group-hover:opacity-0">
          {message}
        </p>
        <p className="absolute break-keep opacity-0 group-hover:opacity-100">
          {message}
        </p>
      </div>
    </div>
  );
};

const nextLayoutImage: Record<GridMode | "_", string> = {
  _: "/rectangle1.png",
  normal: "/squares2.png",
  horiz: "/squaresH.png",
};

const nextLayoutText: Record<GridMode | "_", string> = {
  _: "Switch to focus",
  normal: "Switch to grid",
  horiz: "Switch to grid",
};

export function MainBar() {
  const {
    toggleUpdateShown,
    toggleSettingsShown,
    cycleStreams,
    toggleViewMode,
    toggleNopixel,
    setUpdateShown,
    toggleChat,
  } = useMainStore(selector);
  const nopixelShown = useMainStore(selector2);
  const viewMode = useMainStore(selector3);
  const gridMode = usePersistStore(selectorGrid);
  const chatShown = useMainStore(selector4);

  const toggleNopixelCb = useCallback(() => {
    toggleNopixel();
    setUpdateShown(false);
  }, [toggleNopixel, setUpdateShown]);

  const nextLayoutMode: GridMode | "_" = viewMode === "grid" ? "_" : gridMode;

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
        imageUrl={nextLayoutImage[nextLayoutMode]}
        message={nextLayoutText[nextLayoutMode]}
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
      <LeftBarButton
        imageUrl="/settings.svg"
        message="Settings"
        onClick={toggleSettingsShown}
      />
      <LeftBarText
        message={"Tip: Hover at the top of a stream to switch chat."}
      />
    </div>
  );
}
