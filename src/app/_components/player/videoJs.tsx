import React, { memo, useEffect, useRef } from "react";
import videojs from "video.js";
import type videojs2 from "video.js/dist/video.min";
import type Player from "video.js/dist/types/player";
import "video.js/dist/video-js.css";
import { registerIVSTech, registerIVSQualityPlugin } from "amazon-ivs-player";
import "../../../styles/videojs-custom.css";
import { type RemoteKickLivestream } from "~/types";
import { useKickStore } from "~/app/stores/kickStore";
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

interface KickInfoCategory {
  id?: number;
  name?: string;
  slug?: string;
}

interface KickInfoLivestream {
  id?: number;
  vod_id?: string | null;
  session_title?: string;
  created_at?: string;
  viewer_count?: number;
  categories?: KickInfoCategory[];
  thumbnail?: {
    url?: string;
    src?: string;
    responsive?: string;
    srcset?: string;
  } | null;
}

interface KickChannelInfo {
  playback_url?: string | null;
  livestream?: KickInfoLivestream | null;
}

const rememberVod = (channel: string, live: KickInfoLivestream | null) => {
  const vodId = live?.vod_id;
  const createdAt = live?.created_at;
  useKickStore
    .getState()
    .actions.setVod(
      channel,
      typeof vodId === "string" &&
        vodId &&
        typeof createdAt === "string" &&
        createdAt
        ? { vodId, createdAt }
        : null,
    );
};

// /info's livestream.vod_id is the uuid kick.com/<channel>/videos/<id> opens.
// /livestream's numeric id matches the old videos list, and that page rejects it.
const getLivestreamData = async (
  channel: string,
): Promise<RemoteKickLivestream | null> => {
  const url = `https://kick.com/api/v2/channels/${channel}/info`;
  try {
    const response = await fetch(url, {
      cache: "no-store",
    });
    if (!response.ok) {
      console.error(
        `[videoJS] Failed to fetch livestream for ${channel}: ${response.status} ${response.statusText}`,
      );
      return null;
    }
    const info = (await response.json()) as KickChannelInfo;
    const live = info.livestream;
    if (!live || typeof live.id !== "number") {
      rememberVod(channel, null);
      console.error(
        `[videoJS] Fetch worked but no livestream for ${channel}:`,
        live,
      );
      return null;
    }
    rememberVod(channel, live);
    if (!info.playback_url) {
      console.error(
        `[videoJS] Livestream for ${channel} has no playback_url:`,
        live,
      );
      return null;
    }
    const category = live.categories?.[0];
    const livestream: RemoteKickLivestream = {
      id: live.id,
      channelName: channel,
      session_title: live.session_title ?? "",
      created_at: live.created_at ?? "",
      viewers: live.viewer_count ?? 0,
      playback_url: info.playback_url,
      category: {
        id: category?.id ?? 0,
        name: category?.name ?? "",
        slug: category?.slug ?? "",
      },
      thumbnail: {
        src: live.thumbnail?.url ?? live.thumbnail?.src ?? "",
        srcset: live.thumbnail?.responsive ?? live.thumbnail?.srcset ?? "",
      },
    };
    log(
      `[videoJS] Got livestream data for ${channel}:`,
      livestream,
      live.vod_id,
    );
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
    const refEl = videoRef.current;

    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
      if (refEl) {
        refEl.innerHTML = "";
      }
    };
  }, [playerRef, videoRef]);

  return (
    <div data-vjs-player className="flex h-full w-full">
      <div className="flex h-full w-full" ref={videoRef} />
    </div>
  );
};

export const VideoJS = memo(VideoJSComponent);
