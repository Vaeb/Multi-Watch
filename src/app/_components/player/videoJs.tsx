import React, { memo, useEffect, useRef } from "react";
import videojs from "video.js";
import type videojs2 from "video.js/dist/video.min";
import type Player from "video.js/dist/types/player";
import "video.js/dist/video-js.css";
import { registerIVSTech, registerIVSQualityPlugin } from "amazon-ivs-player";
import "../../../styles/videojs-custom.css";
import { type RemoteKickLivestreamData } from "~/types";
import { log } from "~/app/utils/log";

interface VideoJSProps {
  channel: string;
  options: typeof videojs2.options;
  onReady?: (player: any) => void;
}

/**
 TODO - Ensure playback_url exists on backend m3u8 provider for video playback (confirmed by channel presence in chatroomsLower):
  1. Check chatroomsLower for channel (lower) -> if present, use for VideoJS /api/m3u8 [nothing else needed]
    - onError:
      - Make request for playback_url
        - If exists -> send data to backend. On response, reload stream (make sure no cached response).
        - If not exist -> offline screen
  2. [If not present] Make request for playback_url
  3. Send to backend the channel, playback_url, game (extra: for checking against long-term cache), and title (extra: long-term cache)
  4. Backend returns success -> VideoJS /api/m3u8 -> Else -> Offline screen
 */

const getLivestreamData = async (channel: string) => {
  const url = `https://kick.com/api/v2/channels/${channel}/livestream`;
  try {
    const response = await fetch(url, {
      cache: "no-store",
    });
    if (!response.ok) {
      console.error(
        `[videoJS] Failed to fetch playback_url for ${channel}: ${response.status} ${response.statusText}`,
      );
      return null;
    }
    const livestream = (await response.json()).data as RemoteKickLivestreamData;
    if (!livestream?.playback_url) {
      console.error(
        `[videoJS] Fetch worked but no playback_url/livestream for ${channel}:`,
        livestream,
      );
      return null;
    }
    log(`[videoJS] Got livestream data for ${channel}:`, livestream);
    return livestream;
  } catch (error) {
    console.error(
      `[videoJS] Unexpected error fetching playback url for ${channel}:`,
      error,
    );
    return null;
  }
};

const sendLivestreamDataToBackend = async (channel: string) => {
  const livestream = await getLivestreamData(channel);
  if (!livestream) {
    return false;
  }

  const {
    session_title: title,
    category: { name: game },
    playback_url,
  } = livestream;

  try {
    const res = await fetch(`/api/m3u8/${channel}.m3u8`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, title, game, playback_url }),
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    if (res.status !== 200) {
      console.error(
        `[videoJS] Bad status sending ${channel} livestream data to backend: ${res.status} ${res.statusText}`,
      );

      return false; // Server issue
    }

    return true;
  } catch (err: any) {
    console.error(
      `[videoJS] Error sending ${channel} livestream data to backend: ${err.message}`,
    );
  }

  return false;
};

const VideoJSComponent = ({ channel, options, onReady }: VideoJSProps) => {
  // const isChatroomsReady = useKickStore((state) => state.isChatroomsReady);
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);

  useEffect(() => {
    async function loadVideo() {
      // if (!isChatroomsReady) return;

      // const chatroom = useKickStore.getState().chatroomsLower[channel.toLowerCase()];
      // if (!chatroom) {
      const gotAndStoredPlaybackUrl =
        await sendLivestreamDataToBackend(channel);
      if (!gotAndStoredPlaybackUrl) {
        // TODO: Offline screen
        return;
      }
      // }

      // Make sure Video.js player is only initialized once
      if (!playerRef.current) {
        registerIVSTech(videojs, {
          wasmWorker: "/amazon-ivs-wasmworker.min.js",
          wasmBinary: "/amazon-ivs-wasmworker.min.wasm",
        });
        registerIVSQualityPlugin(videojs);

        // The Video.js player needs to be _inside_ the component el for React 18 Strict Mode.
        const videoElement = document.createElement("video-js");

        videoElement.classList.add("vjs-big-play-centered");
        videoRef.current?.appendChild(videoElement);

        const { sources, ...optionsIvs } = options;

        // qualitySelector(videojs);
        const player = (playerRef.current = videojs(
          videoElement,
          optionsIvs,
          () => {
            log(`[videoJS] Player is ready for ${channel}`);
            onReady?.(player);
          },
        ));

        if (typeof (player as any).enableIVSQualityPlugin === "function") {
          (player as any).enableIVSQualityPlugin();
        }

        // (player as any).hlsQualitySelector({
        //   displayCurrentQuality: true,
        // });

        player.src(sources![0]);

        // You could update an existing player in the `else` block here
        // on prop change, for example:
      } else {
        const player = playerRef.current;

        player.autoplay(options.autoplay);
        player.src(options.sources![0]);
      }
    }

    loadVideo().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, options, videoRef]);

  // Dispose the Video.js player when the functional component unmounts
  useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [playerRef]);

  return (
    <div data-vjs-player className="flex h-full w-full">
      <div className="flex h-full w-full" ref={videoRef} />
    </div>
  );
};

export const VideoJS = memo(VideoJSComponent);
