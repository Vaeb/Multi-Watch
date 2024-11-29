"use client";

import Image from "next/image";
import { type MainState, useMainStore } from "../stores/mainStore";

const selector = (state: MainState) => state.actions;

export function LeftBar() {
  const { toggleUpdateShown } = useMainStore(selector);

  return (
    <div className="absolute flex h-[50%] w-[60px] flex-col gap-3">
      <div className="flex h-[60px] items-center justify-center">
        <button
          className="opacity-40 hover:opacity-100"
          onClick={toggleUpdateShown}
        >
          <Image
            src="/Edit_Profile.svg"
            width={42}
            height={42}
            alt="Update streams"
          />
        </button>
      </div>
    </div>
  );
}
