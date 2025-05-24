"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";

import { type MainState, useMainStore } from "../stores/mainStore";
import { pathToStreams } from "../utils/pathToStreams";

const selector = (state: MainState) => state.actions;

/**
 * Manager: Mounted to root page view on page load.
 */
export function Manager() {
  const { setStreams, markInitialised } = useMainStore(selector);
  const hasSetInitialStreams = useRef(false);

  const pathname = usePathname();

  const slugs = pathname.split("/").filter(Boolean);

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

  useLayoutEffect(() => {
    markInitialised();
  }, [markInitialised]);

  return null;
}
