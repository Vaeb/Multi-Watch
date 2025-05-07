"use client";

import Image from "next/image";
import { type MainState, useMainStore } from "../../stores/mainStore";
import { memo, useCallback, useState } from "react";
import { type GridMode } from "../../stores/storeTypes";
import { type PersistState, usePersistStore } from "../../stores/persistStore";
import { BarText } from "./BarText";
import { addStream } from "../../utils/addStream";
import { type Platform } from "../../../types";

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

  const [quickAddValue, setQuickAddValue] = useState("");

  const toggleNopixelCb = useCallback(() => {
    toggleNopixel();
    setUpdateShown(false);
  }, [toggleNopixel, setUpdateShown]);

  const handleQuickAdd = useCallback(
    (platform: Platform) => {
      if (quickAddValue.trim() === "") return;
      addStream(quickAddValue.trim(), platform);
      setQuickAddValue("");
    },
    [quickAddValue],
  );

  const nextLayoutMode: GridMode | "_" = viewMode === "grid" ? "_" : gridMode;

  return (
    <div
      className={`flex w-full flex-col items-start gap-[6px] pt-3 ${nopixelShown ? "invisible absolute" : ""}`}
    >
      <BarText
        message={
          "Tip: Drag streams to reorder."
          // "Tip 1: Reorder streams by dragging."
        }
        maxLines={1}
      />
      <LeftBarButton
        imageUrl="/Edit_Profile.svg"
        message="Update streams"
        onClick={toggleUpdateShown}
      />
      <div className="flex h-[40px] w-full items-center px-1 opacity-50 group-hover:opacity-100">
        <input
          type="text"
          placeholder="Quick add stream"
          value={quickAddValue}
          onChange={(e) => setQuickAddValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && quickAddValue.trim() !== "") {
              handleQuickAdd("twitch");
            }
          }}
          className="hidden h-[32px] min-w-0 flex-grow rounded-l border border-r-0 border-gray-600 bg-gray-700 px-2 py-1 text-sm text-white placeholder-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 group-hover:block"
        />
        <button
          onClick={() => handleQuickAdd("twitch")}
          // disabled={quickAddValue.trim() === ""}
          className="flex h-[32px] w-[32px] items-center justify-center border-y border-gray-600 bg-gray-700 p-1 text-white hover:bg-gray-600"
          title="Add Twitch Stream"
        >
          <Image
            src="/twitch3.png"
            className="h-[12.1px] min-h-[12.1px] w-[10.45px] min-w-[10.45px] group-hover:h-[22px] group-hover:min-h-[22px] group-hover:w-[19px] group-hover:min-w-[19px]"
            width={19}
            height={22}
            alt="Add Twitch"
          />
        </button>
        <button
          onClick={() => handleQuickAdd("kick")}
          // disabled={quickAddValue.trim() === ""}
          className="flex h-[32px] w-[32px] items-center justify-center rounded-r border border-l-0 border-gray-600 bg-gray-700 p-1 text-white hover:bg-gray-600"
          title="Add Kick Stream"
        >
          <Image
            src="/kick2_32.png"
            className="h-[12.1px] min-h-[12.1px] w-[12.1px] min-w-[12.1px] group-hover:h-[22px] group-hover:min-h-[22px] group-hover:w-[22px] group-hover:min-w-[22px]"
            width={22}
            height={22}
            alt="Add Kick"
          />
        </button>
      </div>
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
