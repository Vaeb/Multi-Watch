"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
  type PropsWithChildren,
} from "react";
import { useMainStore } from "../../stores/mainStore";
import { useShallow } from "zustand/shallow";
import { MainBar } from "./mainBar";
import { usePersistStore } from "../../stores/persistStore";
import { log } from "~/app/utils/log";

// Smooth easing function for better visual appeal
const easeInCubic = (t: number): number => {
  return t * t * t;
};

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
  const rootBarRef = useRef<HTMLDivElement>(null);
  const [proximityOpacity, setProximityOpacity] = useState(0);
  const animationFrameRef = useRef<number>();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setTick] = useState(0);

  // Track when hideBar changes to true
  if (hideBar !== prevHideBar.current) {
    hideBarChangeTime.current = Date.now();
    prevHideBar.current = hideBar;
  }

  // Use long transition for 300ms after hideBar becomes true
  const shouldUseLongTransition = +new Date() - hideBarChangeTime.current < 500;

  // Throttled mouse position calculation for smoother performance
  const calculateProximity = useCallback(
    (mouseX: number) => {
      if (!rootBarRef.current || !hideBar) {
        setProximityOpacity(1);
        return;
      }

      const rect = rootBarRef.current.getBoundingClientRect();
      const barRightEdge = rect.right;

      // Only calculate opacity when mouse is to the right of the bar
      if (mouseX < barRightEdge) {
        setProximityOpacity(1);
        return;
      }

      const distanceFromBar = mouseX - barRightEdge;
      const maxDistance = oneStreamWithNpBar ? 1 : 200;

      if (distanceFromBar > maxDistance) {
        setProximityOpacity(0);
      } else {
        // Use easing function for smoother interpolation
        const normalizedDistance = distanceFromBar / maxDistance;
        const easedProgress = easeInCubic(1 - normalizedDistance);
        setProximityOpacity(Math.max(0, Math.min(1, easedProgress)));
      }
    },
    [hideBar, oneStreamWithNpBar],
  );

  // Mouse position tracking with requestAnimationFrame for smooth updates
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Cancel previous animation frame to prevent stacking
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Use requestAnimationFrame for smooth updates
      animationFrameRef.current = requestAnimationFrame(() => {
        calculateProximity(e.clientX);
      });
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [calculateProximity]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setTick((tick) => tick + 1);
    }, 600);
    return () => clearTimeout(timeout);
  }, [hideBar]);

  const finalOpacity = hideBar ? proximityOpacity : 1;

  return (
    <div
      ref={rootBarRef}
      style={{
        opacity: finalOpacity,
        ...(oneStreamWithNpBar
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
          : {}),
      }}
      className={`group absolute z-10 box-content flex w-[42px] overflow-hidden rounded-lg pl-[2px] pr-[4px] hover:w-[228px] hover:bg-[rgba(0,0,0,0.8)] hover:transition-all ${shouldUseLongTransition ? "duration-300" : "hover:duration-75"} ${hideBar ? "transition-opacity duration-150 ease-out" : `transition-all ${!shouldUseLongTransition ? "duration-75" : ""}`}`}
    >
      {children}
      <MainBar />
    </div>
  );
}
