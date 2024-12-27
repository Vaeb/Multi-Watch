"use client";

import { type PropsWithChildren } from "react";
import { usePersistStore } from "../stores/persistStore";
import { useMainStore } from "../stores/mainStore";
import { useShallow } from "zustand/shallow";

export function RootBar({ children }: PropsWithChildren) {
  const [viewMode, nopixelShown] = useMainStore(
    useShallow((state) => [state.viewMode, state.nopixelShown]),
  );
  const focusHeight = usePersistStore((state) => state.focusHeight);

  return (
    <div
      style={
        nopixelShown
          ? {
              clipPath: `polygon(
          /* top-left */            0%   0%,
          /* top-right */           100% 0%,
          ${
            viewMode === "focused"
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
          /* down to where second hole starts */  
                                    100% calc(100% - 10px - 30px),
                                    0%   calc(100% - 10px - 30px),
          /* skip the second ~~30px~~ 40px hole */  
                                    0%   calc(100% - 0px),
                                    100% calc(100% - 0px),
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
