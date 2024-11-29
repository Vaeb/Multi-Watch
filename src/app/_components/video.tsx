"use client";

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  type DetailedHTMLProps,
  type IframeHTMLAttributes,
} from "react";
import { useStableCallback } from "../hooks/useStableCallback";
import { MainState, useMainStore } from "../stores/mainStore";

type Platform = "twitch" | "kick";

export interface PlayerProps {
  type?: Platform;
  channel: string;
  focus?: boolean;
  first?: boolean;
}

const iframePlayerProps: Record<
  Platform,
  DetailedHTMLProps<IframeHTMLAttributes<HTMLIFrameElement>, HTMLIFrameElement>
> = {
  twitch: {
    title: "Twitch",
    sandbox:
      "allow-modals allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-storage-access-by-user-activation",
  },
  kick: { title: "Twitch" },
};

const getSrc = (type: Platform, channel: string, muted = false) => {
  if (type === "twitch")
    return `https://player.twitch.tv/?channel=${channel}&parent=localhost&muted=${muted}`;
  if (type === "kick")
    // return `https://player.kick.com/${channel}?muted=true&autoplay=true`;
    return `https://player.kick.com/${channel}?muted=${muted}`;
};

function PlayerComponent({ type = "twitch", channel }: PlayerProps) {
  const addedPlayer = useRef<string>("");
  // const selfMute = useMainStore(
  //   useCallback((state) => !!state.manuallyMuted[channel], [channel]),
  // );

  const id = `${channel}-${type}-frame`;

  // Intentionally non-reactive
  const { streams: _streams, newestStream: _newestStream } =
    useMainStore.getState();
  const focus = channel === _streams[0]?.value;
  const first = channel === _newestStream;

  const createPlayer = useStableCallback(() => {
    // eslint-disable-next-line
    return new window.Twitch.Player(id, {
      width: "100%",
      height: "100%",
      channel,
      parent: "localhost",
      muted: false,
      autoplay: !!(first || focus),
    });
  });

  useEffect(() => {
    console.log("[Player] Mounted:", channel);
  }, []);

  useEffect(() => {
    if (type !== "twitch" || addedPlayer.current === id) return;
    addedPlayer.current = id;
    console.log("[Player] Creating twitch player:", id);
    const player = createPlayer();
    useMainStore.getState().actions.setStreamPlayer(channel, player);
  }, [createPlayer, type, id, channel]);

  if (!window.Twitch) return null;

  console.log("[Player] Re-rendered:", channel, type, first, focus);

  return type === "twitch" ? (
    <div id={id} className="h-full w-full border-none"></div>
  ) : (
    <iframe
      className="h-full w-full border-none"
      src={`${getSrc(type, channel, false)}&autoplay=${first || focus ? "true" : "false"}`}
      allowFullScreen={true}
      scrolling="no"
      frameBorder="0"
      allow="autoplay; fullscreen"
      {...iframePlayerProps[type]}
    ></iframe>
  );
}

export const Player = memo(PlayerComponent);
