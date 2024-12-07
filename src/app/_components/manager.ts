"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";

import { type MainState, useMainStore } from "../stores/mainStore";
import { pathToStreams } from "../utils/pathToStreams";

const selector = (state: MainState) => state.actions;

interface ManagerProps {
  chatrooms: Record<string, number>;
}

export function Manager({ chatrooms }: ManagerProps) {
  const { setStreams, setChatrooms } = useMainStore(selector);
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

  useLayoutEffect(() => {
    setChatrooms(chatrooms);
  }, [setChatrooms, chatrooms]);

  return null;
}
