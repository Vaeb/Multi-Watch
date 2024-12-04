"use client";

import {
  memo,
  useEffect,
  useRef,
  useState,
  type DetailedHTMLProps,
  type IframeHTMLAttributes,
} from "react";
import { useStableCallback } from "../hooks/useStableCallback";
import { useMainStore } from "../stores/mainStore";
import { TwitchPlayer, TwitchPlayerInstance } from "react-twitch-embed";

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

let totalPlayers = 0;

const getId = () => `tframe-${++totalPlayers}`;

function PlayerComponent({ type = "twitch", channel, first }: PlayerProps) {
  // const selfMute = useMainStore(
  //   useCallback((state) => !!state.manuallyMuted[channel], [channel]),
  // );

  const [id] = useState(getId);
  const playerRef = useRef<TwitchPlayerInstance | null>(null);

  // Intentionally non-reactive
  const { streams: _streams, newestStream: _newestStream } =
    useMainStore.getState();
  const focus = channel === _streams[0]?.value;
  // const first = channel === _newestStream;

  useEffect(() => {
    console.log("[Player] Mounted:", channel);
  }, []);

  console.log("[Player] Re-rendered:", channel, type, first, focus);

  const handleReady = useStableCallback((player: TwitchPlayerInstance) => {
    playerRef.current = player;
    console.log("[Player] Creating twitch player:", channel, player);
    useMainStore.getState().actions.setStreamPlayer(channel, player);
  });

  return type === "twitch" ? (
    <TwitchPlayer
      className="border-none"
      id={id}
      height="100%"
      width="100%"
      channel={channel}
      autoplay={!!(first || focus)}
      muted={false}
      onReady={handleReady}
    />
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
