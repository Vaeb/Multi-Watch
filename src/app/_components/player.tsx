import { memo, type DetailedHTMLProps, type IframeHTMLAttributes } from "react";

type Platform = "twitch" | "kick";

interface PlayerProps {
  type?: Platform;
  channel: string;
  focus?: boolean;
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

const getSrc = (type: Platform, channel: string) => {
  if (type === "twitch")
    return `https://player.twitch.tv/?channel=${channel}&parent=localhost&muted=false`;
  if (type === "kick")
    // return `https://player.kick.com/${channel}?muted=true&autoplay=true`;
    return `https://player.kick.com/${channel}?muted=false`;
};

function PlayerComponent({
  type = "twitch",
  channel,
  focus,
  first,
}: PlayerProps) {
  console.log(channel, first);
  return (
    <div className={`flex ${focus ? "h-[62%]" : "flex-1"}`}>
      {/* <div> */}
      <iframe
        className="h-full w-full border-none"
        src={`${getSrc(type, channel)}&autoplay=${first || focus ? "true" : "false"}`}
        allowFullScreen={true}
        scrolling="no"
        frameBorder="0"
        allow="autoplay; fullscreen"
        {...iframePlayerProps[type]}
      ></iframe>
      {/* </div> */}
    </div>
  );
}

export const Player = memo(PlayerComponent);
