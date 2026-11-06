"use client";

import { useEffect, useState } from "react";
import { useMainStore } from "../stores/mainStore";
import { getShowChat } from "../utils/getShowChat";
import {
  EmoteCatalog,
  createKickUserIdLookup,
} from "../utils/kickEmoteCatalog";
import { EMPTY_EMOTE_MAP, type EmoteMap } from "../utils/kickEmotes";

let catalog: EmoteCatalog | null = null;

const getKickEmoteCatalog = (): EmoteCatalog => {
  if (!catalog) {
    catalog = new EmoteCatalog({ userIdFor: createKickUserIdLookup() });
    catalog.start();
  }
  return catalog;
};

/**
 * 7TV emotes for one Kick chat panel. Loading is separate from the chat
 * socket: a slow or failed 7TV fetch never delays subscribing to messages.
 * Sets refresh when this panel is opened and about every 30 minutes while
 * it stays open. A failed fetch keeps the last good set.
 */
export const useKickEmotes = (channel: string): EmoteMap => {
  const open = useMainStore(
    (state) => state.chatShown && getShowChat(state) === channel,
  );
  const [emotes, setEmotes] = useState<EmoteMap>(EMPTY_EMOTE_MAP);

  useEffect(() => {
    if (!open) return;
    const active = getKickEmoteCatalog();
    const unsubscribe = active.subscribe(channel, setEmotes);
    void active.watch(channel);
    return () => {
      unsubscribe();
      active.unwatch(channel);
    };
  }, [channel, open]);

  return emotes;
};
