import React, { memo, useEffect, useRef } from "react";
import videojs from "video.js";
import type videojs2 from "video.js/dist/video.min";
import type Player from "video.js/dist/types/player";
import "video.js/dist/video-js.css";
import { registerIVSTech, registerIVSQualityPlugin } from "amazon-ivs-player";
import "../../../styles/videojs-custom.css";
import { log } from "~/app/utils/log";

interface VideoJSProps {
  channel: string;
  options: typeof videojs2.options;
  onReady?: (player: any) => void;
}

const VideoJSComponent = ({ channel, options, onReady }: VideoJSProps) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);

  useEffect(() => {
    function loadVideo() {
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

    loadVideo();
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
