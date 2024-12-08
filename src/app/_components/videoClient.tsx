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
import { TwitchPlayer, type TwitchPlayerInstance } from "react-twitch-embed";
import { checkShowChat } from "../utils/checkShowChat";

type Platform = "twitch" | "kick";

export interface PlayerProps {
  type?: Platform;
  channel: string;
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
    return `https://player.twitch.tv/?channel=${channel}&parent=localhost&parent=multi.vaeb.io&parent=vaeb.io&muted=${muted}`;
  if (type === "kick")
    // return `https://player.kick.com/${channel}?muted=true&autoplay=true`;
    return `https://player.kick.com/${channel}?muted=${muted}`;
};

let totalPlayers = 0;

const getId = () => `tframe-${++totalPlayers}`;

function PlayerComponent({ type = "twitch", channel }: PlayerProps) {
  // const selfMute = useMainStore(
  //   useCallback((state) => !!state.manuallyMuted[channel], [channel]),
  // );

  const [id] = useState(getId);
  const playerRef = useRef<TwitchPlayerInstance | null>(null);

  // Intentionally non-reactive
  const { streamPositions } = useMainStore.getState();
  const focus = streamPositions[channel] === 0;
  const recent = focus || checkShowChat(channel);

  useEffect(() => {
    console.log("[Player] Mounted:", channel);
  }, []);

  console.log("[Player] Re-rendered:", channel, type, recent, focus);

  const handleReady = useStableCallback((player: TwitchPlayerInstance) => {
    playerRef.current = player;
    player.setVolume(0.75);
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
      autoplay={!!recent}
      muted={false}
      onReady={handleReady}
    />
  ) : (
    <div className="flex h-full w-full justify-center">
      <iframe
        className="aspect-video h-full max-h-full max-w-full border-none"
        src={`${getSrc(type, channel, false)}&autoplay=${recent ? "true" : "false"}`}
        allowFullScreen={true}
        scrolling="no"
        frameBorder="0"
        allow="autoplay; fullscreen"
        {...iframePlayerProps[type]}
      ></iframe>
    </div>
  );
}

export const Player = memo(PlayerComponent);
