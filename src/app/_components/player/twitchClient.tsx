"use client";

import { memo, useRef, useState } from "react";
import { TwitchPlayer, type TwitchPlayerInstance } from "react-twitch-embed";
import { useStableCallback } from "~/app/hooks/useStableCallback";
import { useMainStore } from "~/app/stores/mainStore";
import { log } from "~/app/utils/log";

interface TwitchClientProps {
  channel: string;
  startMuted: boolean;
  startAutoplay: boolean;
  seed: number;
  onPlayerReady: () => void;
  showSkeleton: () => void;
  hideSkeleton: () => void;
  refresh: (options?: { muted: boolean }) => void;
}

function TwitchClientComponent({
  channel,
  startMuted,
  startAutoplay,
  onPlayerReady,
  showSkeleton,
  hideSkeleton,
  refresh,
}: TwitchClientProps) {
  const [id] = useState(`twitch-${channel}`);

  const twitchPlayerRef = useRef<TwitchPlayerInstance | null>(null);

  // TODO: Temp remove DragHandle for interaction?
  const handlePlaybackBlocked = useStableCallback(() => {
    log("[TwitchPlayer] Playback blocked:", channel);
  });

  const handleOffline = useStableCallback(() => {
    log("[TwitchPlayer] Offline:", channel);
  });

  const handlePause = useStableCallback(() => {
    log("[TwitchPlayer] Paused:", channel);
  });

  const handleEnded = useStableCallback(() => {
    log("[TwitchPlayer] Ended:", channel);
  });

  const handlePlaying = useStableCallback(() => {
    hideSkeleton();
    log("[TwitchPlayer] Playing:", channel);
  });

  const handlePlay = useStableCallback(() => {
    log("[TwitchPlayer] Play:", channel);
  });

  const onReady = useStableCallback((player: TwitchPlayerInstance) => {
    onPlayerReady();

    const oldSetChannel = player.setChannel;
    player.setChannel = (newChannel: string, options?: { muted: boolean }) => {
      if (newChannel !== channel) {
        oldSetChannel.call(player, newChannel);
      } else {
        showSkeleton();
        refresh(options);
        // setSeed(+new Date());
      }
    };
    twitchPlayerRef.current = player;
    player.setVolume(0.75);
    log("[TwitchPlayer] Creating twitch player:", channel, player);
    useMainStore.getState().actions.setStreamPlayer(channel, player);
  });

  return (
    <TwitchPlayer
      // key={`${id}_${seed}`}
      className="border-none"
      id={id}
      height="100%"
      width="100%"
      channel={channel}
      autoplay={startAutoplay}
      muted={startMuted}
      onReady={onReady}
      onPlaybackBlocked={handlePlaybackBlocked}
      onOffline={handleOffline}
      onPause={handlePause}
      onEnded={handleEnded}
      onPlaying={handlePlaying}
      onPlay={handlePlay}
    />
  );
}

export const TwitchClient = memo(TwitchClientComponent);
