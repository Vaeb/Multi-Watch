"use client";

import { memo, useLayoutEffect } from "react";

import { type MainState, useMainStore } from "../stores/mainStore";
import { shallow } from "zustand/shallow";
import { layoutCellsFocused } from "../utils/layoutCells";
import { MAX_FOCUS_HEIGHT, MIN_FOCUS_HEIGHT } from "../constants";
import { clamp } from "../utils/math";
import { log } from "../utils/log";

const selector = (state: MainState) => ({
  focusHeightAuto: state.focusHeightAuto,
  viewMode: state.viewMode,
  numStreams: state.streams.length,
  containerSize: state.containerSize,
});

function SizeManagerComponent() {
  useLayoutEffect(() => {
    useMainStore.subscribe(
      selector,
      ({ focusHeightAuto, viewMode, numStreams, containerSize }) => {
        log(
          "[SizeManager]",
          focusHeightAuto,
          viewMode,
          numStreams,
          containerSize,
        );
        if (!focusHeightAuto || !containerSize || viewMode !== "focused") {
          return;
        }

        const { width, height } = containerSize;

        const smallCellHeight = Number.parseFloat(
          layoutCellsFocused(numStreams, width, height, 0)[1]?.height ?? "-1",
        );

        if (smallCellHeight < 0) return;

        const autoFocusHeightPx = height - smallCellHeight;
        const autoFocusHeightVh = clamp(
          (autoFocusHeightPx / height) * 100,
          63,
          MAX_FOCUS_HEIGHT,
        );

        log("[SizeManager] Setting auto focus height:", autoFocusHeightVh);

        useMainStore.getState().actions.setFocusHeight(autoFocusHeightVh, true);
      },
      { equalityFn: shallow, fireImmediately: true },
    );
  }, []);

  return null;
}

export const SizeManager = memo(SizeManagerComponent);
