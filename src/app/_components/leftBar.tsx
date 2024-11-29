"use client";

import Image from "next/image";
import { type MainState, useMainStore } from "../stores/mainStore";
import { useCallback } from "react";
import { streamsToPath } from "../utils/streamsToPath";

const selector = (state: MainState) => state.actions;

export function LeftBar() {
  const { toggleUpdateShown, setStreams } = useMainStore(selector);

  const cycle = useCallback(() => {
    const streams = [...useMainStore.getState().streams];
    if (streams.length === 0) return;
    streams.unshift(streams.pop()!);
    setStreams(streams);
    window.history.pushState({}, "", streamsToPath(streams));
  }, [setStreams]);

  return (
    <div className="absolute z-10 flex h-[50%] w-[60px] flex-col gap-3">
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
      <div className="flex h-[60px] items-center justify-center">
        <button
          className="rounded-md bg-slate-700 opacity-40 hover:opacity-100"
          onClick={cycle}
        >
          Cycle
        </button>
      </div>
    </div>
  );
}
