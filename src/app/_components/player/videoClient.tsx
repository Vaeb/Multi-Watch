"use client";

import {
  memo,
  useEffect,
  useRef,
  useState,
  type DetailedHTMLProps,
  type IframeHTMLAttributes,
} from "react";
import { useStableCallback } from "../../hooks/useStableCallback";
import { useMainStore } from "../../stores/mainStore";
import { TwitchPlayer, type TwitchPlayerInstance } from "react-twitch-embed";
import { checkShowChat } from "../../utils/checkShowChat";
import { usePersistStore } from "../../stores/persistStore";
import { log } from "../../utils/log";
import { Skeleton, type SkeletonHandle } from "./skeleton";

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

const THRESHOLD_RECENT_PLAYER_ADDED_DELTA = 1000 * 90;

// let totalPlayers = 0;
let hasAddedPlayers = false;

// const getId = () => `tframe-${++totalPlayers}`; // playerNum

let lastPlayerAddedTick = 0;

function PlayerComponent({ type = "twitch", channel }: PlayerProps) {
  // const selfMute = useMainStore(
  //   useCallback((state) => !!state.manuallyMuted[channel], [channel]),
  // );

  const [id] = useState(`${type}-${channel}`);
  const playerRef = useRef<TwitchPlayerInstance | null>(null);
  const ref = useRef<HTMLIFrameElement | null>(null);
  const [seed, setSeed] = useState(0);
  const mountTimeRef = useRef<number | null>(null);
  const skeletonRef = useRef<SkeletonHandle | null>(null);

  // Intentionally non-reactive
  const { streamPositions } = useMainStore.getState();
  const { autoplay } = usePersistStore.getState();

  const tick = +new Date();
  const playerAddedDelta = tick - lastPlayerAddedTick;
  if (hasAddedPlayers) {
    lastPlayerAddedTick = tick;
  }

  const focus = streamPositions[channel] === 0;
  const recentPriority =
    focus ||
    (checkShowChat(channel) &&
      playerAddedDelta > THRESHOLD_RECENT_PLAYER_ADDED_DELTA);

  const streamAutoplay =
    autoplay === "all" || (autoplay === "one" && !!recentPriority) || seed > 0;

  const streamMuted = autoplay === "all" ? !recentPriority : false;

  useEffect(() => {
    log("[Player] Mounted:", channel);
    mountTimeRef.current = performance.now();
    hasAddedPlayers = true;
  }, []);

  log(
    "[Player] Re-rendered:",
    channel,
    type,
    recentPriority,
    focus,
    streamAutoplay,
    streamMuted,
  );

  const handleReady = useStableCallback((player: TwitchPlayerInstance) => {
    if (mountTimeRef.current) {
      const readyTime = performance.now();
      const elapsedTime = readyTime - mountTimeRef.current;
      log(
        `[Player] ${channel} ready after ${(elapsedTime / 1000).toFixed(2)} seconds`,
      );
    }

    skeletonRef.current?.hide();

    /* (
      player as typeof player & { _iframe: HTMLIFrameElement | undefined }
    )._iframe?.addEventListener("load", handleIframeLoad); */

    const oldSetChannel = player.setChannel;
    player.setChannel = (newChannel) => {
      if (newChannel !== channel) {
        oldSetChannel.call(player, newChannel);
      } else {
        skeletonRef.current?.show();
        setSeed(+new Date());
      }
    };
    playerRef.current = player;
    player.setVolume(0.75);
    log("[Player] Creating twitch player:", channel, player);
    useMainStore.getState().actions.setStreamPlayer(channel, player);
  });

  const handleIframeLoad = useStableCallback(() => {
    log("[Player] Iframe loaded:", channel);
    skeletonRef.current?.hide();
  });

  // TODO: Temp remove DragHandle for interaction?
  const handlePlaybackBlocked = useStableCallback(() => {
    log("[Player] Playback blocked:", channel);
  });

  const handleOffline = useStableCallback(() => {
    log("[Player] Offline:", channel);
  });

  const handlePause = useStableCallback(() => {
    log("[Player] Paused:", channel);
  });

  const handleEnded = useStableCallback(() => {
    log("[Player] Ended:", channel);
  });

  const handlePlaying = useStableCallback(() => {
    skeletonRef.current?.hide();
    log("[Player] Playing:", channel);
  });

  const handlePlay = useStableCallback(() => {
    log("[Player] Play:", channel);
  });

  useEffect(() => {
    if (type === "kick") {
      useMainStore.getState().actions.setStreamPlayer(channel, {
        setChannel(_c) {
          if (!ref.current) return;
          skeletonRef.current?.show();
          ref.current.src = `${getSrc(type, channel, false)}&autoplay=true`;
        },
      } as TwitchPlayerInstance);
    }
  }, [type, channel]);

  return (
    <>
      {type === "twitch" ? (
        <TwitchPlayer
          key={`${id}_${seed}`}
          className="border-none"
          id={id}
          height="100%"
          width="100%"
          channel={channel}
          autoplay={streamAutoplay}
          muted={streamMuted}
          onReady={handleReady}
          onPlaybackBlocked={handlePlaybackBlocked}
          onOffline={handleOffline}
          onPause={handlePause}
          onEnded={handleEnded}
          onPlaying={handlePlaying}
          onPlay={handlePlay}
        />
      ) : (
        <div className="flex h-full w-full justify-center">
          <iframe
            ref={ref}
            className="aspect-video h-full max-h-full max-w-full border-none"
            src={`${getSrc(type, channel, streamMuted)}&autoplay=${streamAutoplay ? "true" : "false"}`}
            allowFullScreen={true}
            scrolling="no"
            frameBorder="0"
            allow="autoplay; fullscreen"
            onLoad={handleIframeLoad}
            {...iframePlayerProps[type]}
          ></iframe>
        </div>
      )}
      <Skeleton ref={skeletonRef} />
    </>
  );
}

export const Player = memo(PlayerComponent);
