import { memo, type DetailedHTMLProps, type IframeHTMLAttributes } from "react";
import { log } from "../utils/log";

type Platform = "twitch" | "kick";

export interface PlayerProps {
  type?: Platform;
  channel: string;
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
    return `https://player.twitch.tv/?channel=${channel}&parent=localhost&parent=multi.vaeb.io&parent=vaeb.io&muted=${muted}`;
  if (type === "kick")
    return `https://player.kick.com/${channel}?muted=${muted}`;
};

function PlayerComponent({ type = "twitch", channel, first }: PlayerProps) {
  log("[Player] Re-rendered:", channel, type, first);

  return (
    <iframe
      className="h-full w-full border-none"
      src={`${getSrc(type, channel, false)}&autoplay=${first ? "true" : "false"}`}
      allowFullScreen={true}
      scrolling="no"
      frameBorder="0"
      allow="autoplay; fullscreen"
      {...iframePlayerProps[type]}
    ></iframe>
  );
}

export const Player = memo(PlayerComponent);
