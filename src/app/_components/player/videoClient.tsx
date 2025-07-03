"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useStableCallback } from "../../hooks/useStableCallback";
import { useMainStore } from "../../stores/mainStore";
import { checkShowChat } from "../../utils/checkShowChat";
import { usePersistStore } from "../../stores/persistStore";
import { log } from "../../utils/log";
import { Skeleton, type SkeletonHandle } from "./skeleton";
import { KickClient } from "./kickClient";
import { TwitchClient } from "./twitchClient";

type Platform = "twitch" | "kick";

export interface PlayerProps {
  type?: Platform;
  channel: string;
}

const THRESHOLD_RECENT_PLAYER_ADDED_DELTA = 1000 * 90;
let hasAddedPlayers = false;
let lastPlayerAddedTick = 0;

function PlayerComponent({ type = "twitch", channel }: PlayerProps) {
  const [seed, setSeed] = useState(0);

  const mountTimeRef = useRef<number | null>(null);
  const skeletonRef = useRef<SkeletonHandle | null>(null);
  const forcedMutedStateRef = useRef<boolean | undefined>();
  const streamMutedRef = useRef<boolean | undefined>();
  const streamAutoplayRef = useRef<boolean | undefined>();

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
    autoplay === "all" || (autoplay === "one" && !!recentPriority);

  let streamMuted: boolean;
  if (forcedMutedStateRef.current !== undefined) {
    streamMuted = forcedMutedStateRef.current;
    forcedMutedStateRef.current = undefined;
  } else {
    streamMuted = autoplay === "all" ? !recentPriority : false;
  }

  streamMutedRef.current = streamMuted;
  streamAutoplayRef.current = streamAutoplay;

  log(
    "[Player] Re-rendered:",
    channel,
    type,
    recentPriority,
    focus,
    streamAutoplay,
    streamMuted,
  );

  const recordReadyTime = useStableCallback(() => {
    const readyTime = performance.now();
    if (mountTimeRef.current) {
      const elapsedTime = readyTime - mountTimeRef.current;
      log(
        `[Player] ${channel} ready after ${(elapsedTime / 1000).toFixed(2)} seconds`,
      );
    }
  });

  const showSkeleton = useCallback(() => skeletonRef.current?.show(), []);
  const hideSkeleton = useCallback(() => skeletonRef.current?.hide(), []);

  const refresh = useCallback((options?: { muted: boolean }) => {
    if (options !== undefined) {
      forcedMutedStateRef.current = options.muted;
    }
    setSeed(+new Date());
  }, []);

  const onPlayerReady = useStableCallback(() => {
    recordReadyTime();
    hideSkeleton();
  });

  useEffect(() => {
    log("[Player] Mounted:", channel);
    mountTimeRef.current = performance.now();
    hasAddedPlayers = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {type === "twitch" ? (
        <TwitchClient
          channel={channel}
          startMuted={streamMuted}
          startAutoplay={streamAutoplay}
          seed={seed}
          onPlayerReady={onPlayerReady}
          showSkeleton={showSkeleton}
          hideSkeleton={hideSkeleton}
          refresh={refresh}
        />
      ) : (
        <KickClient
          key={`kick-${channel}-${seed}`}
          channel={channel}
          startMuted={streamMuted}
          startAutoplay={streamAutoplay}
          seed={seed}
          onPlayerReady={onPlayerReady}
          refresh={refresh}
        />
      )}
      <Skeleton ref={skeletonRef} channel={channel} type={type} />
    </>
  );
}

export const Player = memo(PlayerComponent);
