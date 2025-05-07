"use client";

import { memo, useLayoutEffect } from "react";

import { type MainState, useMainStore } from "../stores/mainStore";
import { shallow } from "zustand/shallow";
import { layoutCellsFocused } from "../utils/layoutCells";
import { clamp } from "../utils/math";
import { log } from "../utils/log";

const selector = (state: MainState) => ({
  focusHeightAuto: state.focusHeightAuto,
  viewMode: state.viewMode,
  numStreams: state.streams.length,
  containerSize: state.containerSize,
  chatShown: state.chatShown,
});

function SizeManagerComponent() {
  useLayoutEffect(() => {
    useMainStore.subscribe(
      selector,
      ({ focusHeightAuto, viewMode, numStreams, containerSize, chatShown }) => {
        log(
          "[SizeManager]",
          focusHeightAuto,
          viewMode,
          numStreams,
          containerSize,
        );

        const minFocus = chatShown ? 60 : 60; // 60, 65 // 60, 61

        if (!focusHeightAuto || !containerSize || viewMode !== "focused") {
          return;
        }

        const { width, height } = containerSize;

        const baseCells = layoutCellsFocused(
          numStreams,
          width,
          height,
          minFocus,
        );
        if (baseCells.length <= 1) {
          return;
        }

        let smallestY = Infinity;
        let largestY = -Infinity;
        for (let i = 1; i < baseCells.length; i++) {
          const cell = baseCells[i]!;
          const y = Number.parseFloat(cell.y);
          const height = Number.parseFloat(cell.height);
          smallestY = Math.min(smallestY, y);
          largestY = Math.max(largestY, y + height);
        }

        const smallCellsHeight = largestY - smallestY;
        if (!smallCellsHeight) return;

        const autoFocusHeightPx = height - smallCellsHeight;
        const autoFocusHeightVh = clamp(
          (autoFocusHeightPx / height) * 100,
          0,
          100,
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
