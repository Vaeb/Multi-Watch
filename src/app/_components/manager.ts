"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";

import { type MainState, useMainStore } from "../stores/mainStore";
import { pathToStreams } from "../utils/pathToStreams";
import { type KickState, useKickStore } from "../stores/kickStore";

const selector = (state: MainState) => state.actions;
const kickSelector = (state: KickState) => state.actions;

interface ManagerProps {
  chatrooms: KickState["chatrooms"];
}

/**
 * Renders once on page load, and then never again.
 */
export function Manager({ chatrooms }: ManagerProps) {
  const { setStreams, markInitialised } = useMainStore(selector);
  const { setChatrooms } = useKickStore(kickSelector);
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

  useLayoutEffect(() => {
    markInitialised();
  }, [markInitialised]);

  return null;
}
