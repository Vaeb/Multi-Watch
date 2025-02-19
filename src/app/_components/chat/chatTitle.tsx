"use client";

import { type MainState, useMainStore } from "../../stores/mainStore";
import { getShowChat } from "../../utils/getShowChat";

const selector = (state: MainState) => getShowChat(state);

function ChatTitleComponent() {
  const showChat = useMainStore(selector);

  return (
    <div className="w-full bg-[#18181b] px-4 pt-4 text-sm font-bold">
      <p>{(showChat || "").toUpperCase()}</p>
    </div>
  );
}

export const ChatTitle = ChatTitleComponent;
