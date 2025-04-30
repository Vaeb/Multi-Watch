"use client";

import { type PropsWithChildren } from "react";
import { useMainStore } from "../../stores/mainStore";
import { useShallow } from "zustand/shallow";

export function RootBar({ children }: PropsWithChildren) {
  const [oneStreamWithNpBar, showTopHole] = useMainStore(
    useShallow((state) => [
      state.nopixelShown && state.streams.length > 0,
      state.viewMode === "focused" &&
        state.streams.length > 1 &&
        state.streamsOrdered[0]?.type === "twitch",
    ]),
  );
  const focusHeight = useMainStore((state) => state.focusHeight);

  const showBottomHole = oneStreamWithNpBar;

  return (
    <div
      style={
        oneStreamWithNpBar
          ? {
              clipPath: `polygon(
          /* top-left */            0%   0%,
          /* top-right */           100% 0%,
          ${
            showTopHole
              ? `
          /* down to where first hole starts */  
                                    100% calc(${focusHeight}% - 10px - 30px),
                                    0%   calc(${focusHeight}% - 10px - 30px),
          /* skip the first 30px hole */  
                                    0%   calc(${focusHeight}% - 10px),
                                    100% calc(${focusHeight}% - 10px),
          `
              : ""
          }
          ${
            showBottomHole
              ? `
          /* down to where second hole starts */  
                                    100% calc(100% - 10px - 30px),
                                    0%   calc(100% - 10px - 30px),
          /* skip the second ~~30px~~ 40px hole */  
                                    0%   calc(100% - 0px),
                                    100% calc(100% - 0px),
          `
              : ""
          }
          /* bottom-right */        100% 100%,
          /* bottom-left */         0%   100%
        )`,
            }
          : {}
      }
      className="group absolute z-10 box-content flex w-[42px] overflow-hidden rounded-lg pl-[2px] pr-[4px] transition-all duration-75 hover:w-[228px] hover:bg-[rgba(0,0,0,0.8)]"
    >
      {children}
    </div>
  );
}
