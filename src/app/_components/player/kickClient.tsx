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
  refresh: (options?: { muted: boolean }) => void;
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

    // Track restart attempts to prevent infinite loops (resets on rerender)
    let restartAttempts = 0;
    const maxRestartAttempts = 3;
    let restartTimeout: NodeJS.Timeout | null = null;
    let lastRestartAt: number | null = null;

    const attemptRestart = (reason: string) => {
      const now = Date.now();
      if (lastRestartAt && now - lastRestartAt > 6000) {
        log(
          "[KickClient] More than 6s since last restart, resetting restartAttempts",
        );
        restartAttempts = 0;
      }

      if (restartAttempts >= maxRestartAttempts) {
        log(
          `[KickClient] Max restart attempts (${maxRestartAttempts}) reached for ${channel}, stopping restarts`,
        );
        return;
      }

      restartAttempts++;
      log(
        `[KickClient] Attempting restart ${restartAttempts}/${maxRestartAttempts} for ${channel} due to: ${reason}`,
      );

      // Clear any existing restart timeout
      if (restartTimeout) {
        clearTimeout(restartTimeout);
      }

      // Delay restart to avoid immediate re-triggering
      restartTimeout = setTimeout(() => {
        lastRestartAt = Date.now();
        refresh();
      }, 2000 * restartAttempts); // Exponential backoff: 2s, 4s, 6s
    };

    // Reset restart counter on successful playback
    kickPlayer.on("playing", () => {
      log("[KickClient] Player started playing, resetting restart counter");
      restartAttempts = 0;
      if (restartTimeout) {
        clearTimeout(restartTimeout);
        restartTimeout = null;
      }
    });

    // Handle various playback failure events
    kickPlayer.on("error", () => {
      const error = kickPlayer.error();
      log("[KickClient] Player error:", error);
      attemptRestart(`error (${error?.code || "unknown"})`);
    });

    kickPlayer.on("stalled", () => {
      log("[KickClient] Player stalled");
      attemptRestart("stalled");
    });

    kickPlayer.on("abort", () => {
      log("[KickClient] Player aborted");
      attemptRestart("abort");
    });

    kickPlayer.on("emptied", () => {
      log("[KickClient] Player emptied");
      attemptRestart("emptied");
    });

    kickPlayer.on("suspend", () => {
      log("[KickClient] Player suspended");
      // Only restart on suspend if we're not already playing
      if (kickPlayer.paused()) {
        attemptRestart("suspend");
      }
    });

    // Handle extended waiting periods (potential stream issues)
    let waitingTimeout: NodeJS.Timeout | null = null;
    kickPlayer.on("waiting", () => {
      log("[KickClient] Player is waiting");

      // If waiting for more than 30 seconds, attempt restart
      waitingTimeout = setTimeout(() => {
        const readyState = kickPlayer.readyState();
        // Check if player doesn't have enough data (readyState values: 0=HAVE_NOTHING, 1=HAVE_METADATA, 2=HAVE_CURRENT_DATA, 3=HAVE_FUTURE_DATA, 4=HAVE_ENOUGH_DATA)
        if (Number(readyState) < 2) {
          log("[KickClient] Extended waiting period, attempting restart");
          attemptRestart("extended waiting");
        }
      }, 30000);
    });

    kickPlayer.on("canplay", () => {
      if (waitingTimeout) {
        clearTimeout(waitingTimeout);
        waitingTimeout = null;
      }
    });

    kickPlayer.on("dispose", () => {
      log("[KickClient] Player will dispose");

      // Clean up timeouts on dispose
      if (restartTimeout) {
        clearTimeout(restartTimeout);
      }
      if (waitingTimeout) {
        clearTimeout(waitingTimeout);
      }
    });

    useMainStore.getState().actions.setStreamPlayer(channel, {
      setChannel: (_newChannel: string, options?: { muted: boolean }) => {
        log(`[KickClient] setChannel called for ${channel}`, { options });
        if (options) {
          // Pass the muted option to the refresh function so it can be applied
          refresh(options);
        } else {
          refresh();
        }
      },
    } as KickPlayer);
  });

  return (
    <VideoJS channel={channel} options={kickPlayerOptions} onReady={onReady} />
  );
}

export const KickClient = memo(KickClientComponent);
