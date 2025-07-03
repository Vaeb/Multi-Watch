"use client";

import Image from "next/image";
import { type MainState, useMainStore } from "../../stores/mainStore";
import { memo, useCallback, useState } from "react";
import { type PersistState } from "../../stores/persistStore";
import { addStream } from "../../utils/addStream";
import { type Platform } from "../../../types";
import { BarHeader } from "./BarHeader";

const selector = (state: MainState) => state.actions;
const selector2 = (state: MainState) => state.nopixelShown;
const selector3 = (state: MainState) => state.viewMode;
const selector4 = (state: MainState) => state.chatShown;
const selector5 = (state: MainState) =>
  state.settingsShown || state.updateShown;

interface LeftBarButtonProps {
  imageUrl?: string;
  message: string;
  onClick: (...args: any[]) => any;
  style?: any;
  modalShown: boolean;
  children?: React.ReactElement;
}

const LeftBarButton = ({
  imageUrl,
  message,
  onClick,
  children,
  modalShown,
  style,
}: LeftBarButtonProps) => {
  return (
    <button
      className={`group/btn flex w-full whitespace-nowrap rounded-lg px-2 py-[3px] text-[#ddd] hover:text-white`}
      onClick={onClick}
    >
      <div className="flex h-full w-full items-center gap-3 whitespace-nowrap rounded-md py-[7px] pl-2 pr-1 group-hover/btn:bg-[#6B46C1]">
        {children || imageUrl ? (
          <div className={`flex w-[24px] shrink-0 items-center justify-center`}>
            <div className="opacity-50 group-hover/btn:!opacity-100 group-hover:opacity-70">
              {children ?? (
                <Image
                  style={style}
                  className="min-h-[20px] min-w-[20px]"
                  src={imageUrl!}
                  width={20}
                  height={20}
                  alt={message}
                />
              )}
            </div>
          </div>
        ) : null}
        <p
          className="text-[15px] font-medium opacity-0 delay-75 group-hover:opacity-100 group-hover:delay-0"
          style={modalShown ? { opacity: 1 } : undefined}
        >
          {message}
        </p>
      </div>
    </button>
  );
};

const QuickAddStream = ({ modalShown }: { modalShown: boolean }) => {
  const [quickAddValue, setQuickAddValue] = useState("");

  const handleQuickAdd = useCallback(
    (platform: Platform) => {
      if (quickAddValue.trim() === "") return;
      addStream(quickAddValue.trim(), platform);
      setQuickAddValue("");
    },
    [quickAddValue],
  );

  return (
    // <div className="flex h-[40px] w-full items-center px-1 opacity-50 group-hover:opacity-100">
    <div
      className={`flex w-full whitespace-nowrap rounded-lg px-2 py-[7px] text-[#ddd] opacity-50 hover:text-white group-hover:opacity-80`}
    >
      <input
        type="text"
        placeholder="Quick add stream"
        value={quickAddValue}
        onChange={(e) => setQuickAddValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && quickAddValue.trim() !== "") {
            handleQuickAdd("kick");
          }
        }}
        style={modalShown ? { display: "block" } : undefined}
        className="peer hidden h-[32px] min-w-0 flex-grow rounded-l-md border border-r-0 border-gray-600 bg-[#2f2f2f] px-2 py-[7px] pl-2 pr-1 text-sm text-white placeholder-gray-400 focus:border-slate-500 focus:outline-none focus:ring-0 group-hover:block"
      />
      <button
        onClick={() => handleQuickAdd("kick")}
        // disabled={quickAddValue.trim() === ""}
        className="flex h-[32px] w-[32px] items-center justify-center rounded-l-md border-y border-gray-600 bg-[#2f2f2f] p-1 text-white hover:bg-gray-600 group-hover:rounded-l-none peer-focus:border-slate-500"
        style={
          modalShown
            ? { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }
            : undefined
        }
        title="Add Kick Stream"
      >
        <Image
          src="/kick2_32.png"
          className="h-[12.1px] min-h-[12.1px] w-[12.1px] min-w-[12.1px] group-hover:h-[22px] group-hover:min-h-[22px] group-hover:w-[22px] group-hover:min-w-[22px]"
          style={
            modalShown
              ? { height: 22, minHeight: 22, width: 22, minWidth: 22 }
              : undefined
          }
          width={22}
          height={22}
          alt="Add Kick"
        />
      </button>
      <button
        onClick={() => handleQuickAdd("twitch")}
        // disabled={quickAddValue.trim() === ""}
        className="flex h-[32px] w-[32px] items-center justify-center rounded-r-md border border-l-0 border-gray-600 bg-[#2f2f2f] p-1 text-white hover:bg-gray-600 peer-focus:border-slate-500"
        title="Add Twitch Stream"
      >
        <Image
          src="/twitch3.png"
          className="h-[12.1px] min-h-[12.1px] w-[10.45px] min-w-[10.45px] group-hover:h-[22px] group-hover:min-h-[22px] group-hover:w-[19px] group-hover:min-w-[19px]"
          style={
            modalShown
              ? { height: 22, minHeight: 22, width: 19, minWidth: 19 }
              : undefined
          }
          width={19}
          height={22}
          alt="Add Twitch"
        />
      </button>
    </div>
  );
};

// MainBarComponent background color (provided in parent): #1f1f1f
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
  // const gridMode = usePersistStore(selectorGrid);
  const chatShown = useMainStore(selector4);
  const modalShown = useMainStore(selector5);

  const toggleNopixelCb = useCallback(() => {
    toggleNopixel();
    setUpdateShown(false);
  }, [toggleNopixel, setUpdateShown]);

  // const nextLayoutMode: GridMode | "_" = viewMode === "grid" ? "_" : gridMode;
  const isGrid = viewMode === "grid";

  return (
    <>
      <div
        className={`flex w-full flex-col pb-[6px] pt-4 ${nopixelShown ? "invisible absolute" : ""}`}
      >
        <BarHeader
          message="Stream Controls"
          shortMessage={modalShown ? undefined : "Str"}
          isFirst
        />

        <div className="flex flex-col gap-0">
          <LeftBarButton
            message="Update streams"
            onClick={toggleUpdateShown}
            modalShown={modalShown}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              xmlSpace="preserve"
              width="21"
              height="21"
              viewBox="0 0 256 256"
            >
              <path
                fill="currentColor"
                d="M240.9 128c-2.2 0-4 1.8-4 4v81.7c0 13-10 23.6-22.3 23.6H40.4c-12.3 0-22.3-10.6-22.3-23.6V42.2c0-13 10-23.6 22.3-23.6h84.3c2.2 0 4-1.8 4-4s-1.8-4-4-4H40.4C23.7 10.5 10 24.7 10 42.2v171.6c0 17.5 13.7 31.7 30.4 31.7h174.1c16.8 0 30.4-14.2 30.4-31.7v-81.7c.1-2.3-1.7-4.1-4-4.1z"
                data-title="Layer 0"
              />
              <path
                fill="currentColor"
                d="m178 42.3-107 107s0 .1-.1.1c-.2.2-.3.4-.5.7-.1.2-.3.4-.4.7 0 0 0 .1-.1.1l-15.3 45.8v.5c0 .3-.1.5-.1.8 0 .3 0 .6.1.8v.5c0 .1.1.2.1.3.1.2.1.3.2.5.2.3.4.5.6.7l.3.3c.3.3.7.5 1.2.6h.1c.4.1.8.2 1.3.2s.9-.1 1.3-.2l45.8-15.3s.1 0 .1-.1c.3-.1.5-.3.7-.4.2-.1.5-.3.7-.4 0 0 .1 0 .1-.1l107-106.9L244.8 48c1.6-1.6 1.6-4.1 0-5.7l-30.5-30.6c-1.6-1.6-4.1-1.6-5.7 0L178 42.3c0-.1 0-.1 0 0zm33.4-22 24.8 24.8-24.8 24.8-24.8-24.8 24.8-24.8zm-5.7 55.4L102.3 179.1 65 191.5l12.4-37.2L180.8 50.8l24.9 24.9z"
                data-title="Layer 1"
              />
            </svg>
          </LeftBarButton>

          <QuickAddStream modalShown={modalShown} />

          <LeftBarButton
            imageUrl="/np3.png"
            message="Add NoPixel streams"
            onClick={toggleNopixelCb}
            modalShown={modalShown}
          />

          <LeftBarButton
            message="Reload streams"
            onClick={reloadAllStreams}
            modalShown={modalShown}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="21"
              height="21"
              viewBox="0 0 100 100"
            >
              <g
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={12}
              >
                <path d="M50 10v35M20 29C4 52 15 90 50 90s50-43 24-70" />
              </g>
              <path fill="currentColor" d="m2 21 29-2 2 29" />
            </svg>
          </LeftBarButton>

          <LeftBarButton
            message="Rotate streams"
            onClick={cycleStreams}
            modalShown={modalShown}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              width="23"
              height="23"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8Z"
              />
              <path
                fill="currentColor"
                d="M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM12 6c-3.31 0-6 2.69-6 6H4c0-4.42 3.58-8 8-8v2ZM12 18c3.31 0 6-2.69 6-6h2c0 4.42-3.58 8-8 8v-2Z"
              />
            </svg>
          </LeftBarButton>
        </div>

        <BarHeader
          message="Layout"
          shortMessage={modalShown ? undefined : "Lay"}
        />

        <div className="flex flex-col gap-0">
          <LeftBarButton
            message={isGrid ? "Switch to focus" : "Switch to grid"}
            onClick={toggleViewMode}
            modalShown={modalShown}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="opacity-70 group-hover/btn:opacity-100"
            >
              <rect
                x="1"
                y="1"
                width={isGrid ? "18" : "7"}
                height="7"
                rx="1"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="currentColor"
              />
              {isGrid ? null : (
                <rect
                  x="12"
                  y="1"
                  width="7"
                  height="7"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="currentColor"
                />
              )}
              <rect
                x="1"
                y="12"
                width="7"
                height="7"
                rx="1"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="currentColor"
              />
              <rect
                x="12"
                y="12"
                width="7"
                height="7"
                rx="1"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="currentColor"
              />
            </svg>
          </LeftBarButton>

          <LeftBarButton
            message={chatShown ? "Hide chat" : "Show chat"}
            onClick={toggleChat}
            modalShown={modalShown}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="opacity-70 group-hover/btn:opacity-100"
            >
              <path
                d="M10 1C5.03 1 1 4.58 1 9C1 11.55 2.2 13.84 4.07 15.34C4.07 15.89 3.9 17.31 2.26 18.7C2.26 18.7 4.68 18.82 6.54 17.48C7.61 17.81 8.77 18 10 18C14.97 18 19 14.42 19 10C19 5.58 14.97 1 10 1Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </LeftBarButton>
        </div>

        <BarHeader
          message="Settings"
          shortMessage={modalShown ? undefined : "Set"}
        />

        <div className="flex flex-col gap-0">
          <LeftBarButton
            message="Settings"
            onClick={toggleSettingsShown}
            modalShown={modalShown}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              width="22"
              height="22"
              viewBox="0 0 24 24"
            >
              <path
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                d="M11.4 3.6c.3-.1.7-.1 1.2-.1s.9 0 1.2.1l.7 2.9c.4.1.8.3 1.2.5l2.6-1.3c.5.3.9.7 1.3 1.1.4.4.7.8 1 1.3l-1.3 2.6c.2.4.4.8.5 1.2l2.9.7c.1.3.1.7.1 1.2s0 .9-.1 1.2l-2.9.7c-.1.4-.3.8-.5 1.2l1.3 2.6c-.3.5-.6.9-1 1.3s-.8.7-1.3 1l-2.6-1.3c-.4.2-.8.4-1.2.5l-.7 2.9c-.3.1-.7.1-1.2.1s-.9 0-1.2-.1l-.7-2.9c-.4-.1-.8-.3-1.2-.5l-2.6 1.3c-.5-.3-.9-.6-1.3-1s-.7-.8-1-1.3l1.3-2.6c-.2-.4-.4-.8-.5-1.2L2.5 15c-.1-.3-.1-.7-.1-1.2s0-.9.1-1.2l2.9-.7c.1-.4.3-.8.5-1.2L4.6 8.1c.3-.5.6-.9 1-1.3s.8-.8 1.3-1.1L9.5 7c.4-.2.8-.4 1.2-.5l.7-2.9Zm1.2 12.2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
              />
            </svg>
          </LeftBarButton>
        </div>

        {/* <div className="mt-auto pb-4 pt-2">
          <BarText
            message={
              "Tip: Drag streams to reorder."
              // "Tip 1: Reorder streams by dragging."
            }
            shortMessage=""
            maxLines={1}
          />
        </div> */}
      </div>
    </>
  );
};

export const MainBar = memo(MainBarComponent);
