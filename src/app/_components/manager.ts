"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";

import { type MainState, useMainStore } from "../stores/mainStore";
import { pathToStreams } from "../utils/pathToStreams";

const selector = (state: MainState) => state.actions;

export function Manager() {
  const { setStreams } = useMainStore(selector);
  const hasSetInitialStreams = useRef(false);

  const pathname = usePathname();

  useLayoutEffect(() => {
    if (
      useMainStore.getState().streams.length > 0 ||
      hasSetInitialStreams.current
    ) {
      return;
    }
    hasSetInitialStreams.current = true;
    setStreams(pathToStreams(pathname));
  }, [setStreams, pathname]);

  return null;
}
