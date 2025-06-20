"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { useMainStore } from "../../stores/mainStore";
import { useShallow } from "zustand/shallow";
import { MainBar } from "./mainBar";
import { usePersistStore } from "../../stores/persistStore";
import { log } from "~/app/utils/log";

export function RootBar({ children }: PropsWithChildren) {
  const [hasStreams, oneStreamWithNpBar, showTopHole] = useMainStore(
    useShallow((state) => [
      state.streams.length > 0,
      state.nopixelShown && state.streams.length > 0,
      state.viewMode === "focused" &&
        state.streams.length > 1 &&
        state.streamsOrdered[0]?.type === "twitch",
    ]),
  );
  const focusHeight = useMainStore((state) => state.focusHeight);
  const hideLeftBar = usePersistStore((state) => state.hideLeftBar);

  const hideBar = hideLeftBar && hasStreams;

  const showBottomHole = oneStreamWithNpBar;

  const prevHideBar = useRef(hideBar);
  const hideBarChangeTime = useRef(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setTick] = useState(0);

  // Track when hideBar changes to true
  if (hideBar !== prevHideBar.current) {
    hideBarChangeTime.current = Date.now();
    prevHideBar.current = hideBar;
  }

  // Use long transition for 300ms after hideBar becomes true
  const shouldUseLongTransition = +new Date() - hideBarChangeTime.current < 500;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setTick((tick) => tick + 1);
    }, 600);
    return () => clearTimeout(timeout);
  }, [hideBar]);

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
      className={`group absolute z-10 box-content flex w-[42px] overflow-hidden rounded-lg pl-[2px] pr-[4px] transition-all hover:w-[228px] hover:bg-[rgba(0,0,0,0.8)] ${shouldUseLongTransition ? "duration-300" : "duration-75"} ${hideBar ? "opacity-0 hover:opacity-100" : ""}`}
    >
      {children}
      <MainBar />
    </div>
  );
}
