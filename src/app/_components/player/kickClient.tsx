"use client";

import { memo, useMemo, useRef } from "react";
import { VideoJS } from "./videoJs";
import type videojs2 from "video.js/dist/video.min";
import { useStableCallback } from "~/app/hooks/useStableCallback";
import { log } from "~/app/utils/log";
import { type KickPlayer, useMainStore } from "~/app/stores/mainStore";

type VideoJsOptions = typeof videojs2.options;

const getKickPlayerOptions = (
  channel: string,
  muted = false,
  autoplay = true,
) => {
  return window
    ? ({
        controlBar: {
          volumePanel: { inline: true },
        },
        fluid: true,
        aspectRatio: "16:9",
        techOrder: ["AmazonIVS"],
        autoplay,
        controls: true,
        liveui: true,
        muted,
        bigPlayButton: false,
        inactivityTimeout: 100,
        noUITitleAttributes: false,
        fullscreen: { options: { navigationUI: "hide" } },
        userActions: { click: false, doubleClick: false },
        sources: [
          {
            src: `${window.location.origin}/api/m3u8/${channel}.m3u8`,
            type: "application/x-mpegURL",
          },
        ],
      } as VideoJsOptions)
    : ({} as VideoJsOptions);
};

interface KickClientProps {
  channel: string;
  startMuted: boolean;
  startAutoplay: boolean;
  seed: number;
  onPlayerReady: () => void;
  refresh: () => void;
}

function KickClientComponent({
  channel,
  startMuted,
  startAutoplay,
  seed,
  onPlayerReady,
  refresh,
}: KickClientProps) {
  const kickPlayerRef = useRef<videojs2.Player | null>(null);
  const startMutedRef = useRef<boolean | undefined>();
  const startAutoplayRef = useRef<boolean | undefined>();

  // Player properties that only apply to the first mount or resets
  startMutedRef.current = startMuted;
  startAutoplayRef.current = startAutoplay;

  const kickPlayerOptions = useMemo(
    () =>
      getKickPlayerOptions(
        channel,
        startMutedRef.current,
        startAutoplayRef.current,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [channel, seed],
  );

  const onReady = useStableCallback((kickPlayer: videojs2.Player) => {
    onPlayerReady();

    kickPlayerRef.current = kickPlayer;

    log("[KickClient] Kick player ready:", channel);

    // You can handle player events here, for example:
    kickPlayer.on("waiting", () => {
      log("[KickClient] Player is waiting");
    });

    kickPlayer.on("dispose", () => {
      log("[KickClient] Player will dispose");
    });

    useMainStore.getState().actions.setStreamPlayer(channel, {
      setChannel: (_newChannel: string, _options?: { muted: boolean }) => {
        refresh();
        // const muted = options?.muted ?? true;
      },
    } as KickPlayer);
  });

  return (
    <VideoJS channel={channel} options={kickPlayerOptions} onReady={onReady} />
  );
}

export const KickClient = memo(KickClientComponent);
