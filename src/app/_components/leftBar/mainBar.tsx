"use client";

import Image from "next/image";
import { type MainState, useMainStore } from "../../stores/mainStore";
import { memo, useCallback } from "react";
import { type GridMode } from "../../stores/storeTypes";
import { type PersistState, usePersistStore } from "../../stores/persistStore";
import { BarText } from "./BarText";

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

const nextLayoutImage: Record<GridMode | "_", string> = {
  _: "/rectangle1.png",
  normal: "/squares2.png",
  horiz: "/squares2.png", // squaresH
};

const nextLayoutText: Record<GridMode | "_", string> = {
  _: "Switch to focus",
  normal: "Switch to grid",
  horiz: "Switch to grid",
};

const MainBarComponent = () => {
  const {
    toggleUpdateShown,
    toggleSettingsShown,
    cycleStreams,
    toggleViewMode,
    toggleNopixel,
    setUpdateShown,
    toggleChat,
    reloadAllStreams,
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
        message="Add NoPixel streams"
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
        imageUrl="/refresh3.svg"
        message="Reload streams"
        onClick={reloadAllStreams}
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
      <BarText
        message={
          "Tip: Drag streams to reorder."
          // "Tip 1: Reorder streams by dragging."
        }
        maxLines={2}
      />
      {viewMode === "focused" ? (
        <BarText
          message={
            "Tip: Resize streams by dragging the border between the focused and small streams."
            // "Tip 2: Drag the border between focused and small streams to resize."
          }
          maxLines={3}
        />
      ) : null}
    </div>
  );
};

export const MainBar = memo(MainBarComponent);
