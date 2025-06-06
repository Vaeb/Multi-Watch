"use client";

import { persistDefaults, usePersistStore } from "../../stores/persistStore";
import { ChatTitle } from "./chatTitle";
import { HorizontalResizer } from "./horizontalResizer";

export function ChatsContainer({
  show,
  children,
}: {
  show: boolean;
  children?: React.ReactNode;
}) {
  const chatWidth = usePersistStore((state) => state.chatWidth);
  return (
    <div
      id="chat-container"
      style={{ width: `${chatWidth}px` }}
      className={`relative flex h-full ${
        chatWidth === persistDefaults.chatWidth ? "max-w-[25%]" : ""
      } flex-col ${show ? "" : "hidden"}`}
    >
      <HorizontalResizer width={Number(chatWidth)} />
      <ChatTitle />
      <div className={`relative flex-1`}>
        {children}
        {chatWidth >= 320 ? (
          <div className="absolute h-[48px] w-full bg-[#18181b] p-4 pt-1 text-sm font-bold">
            <p>Tip: Switch chat by hovering at the top of a stream.</p>
            <p>
              Tip: Resize chat by dragging the border between the chat and
              streams.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
