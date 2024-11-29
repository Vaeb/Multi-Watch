import { memo } from "react";
import { type PlayerProps } from "./video";
import { PlayerOverlay } from "./playerOverlay";

interface PlayerWrapperProps extends PlayerProps {
  children: React.ReactNode;
}

function PlayerWrapperComponent({ children, ...props }: PlayerWrapperProps) {
  return (
    // <div className={`relative ${props.focus ? "col-span-2 h-[62%]" : "col-span-1"}`}>
    <div
      className={`relative ${props.focus ? "h-[62%] w-full" : "h-[38%] grow"}`}
    >
      <PlayerOverlay {...props} />
      {children}
    </div>
  );
}

export const PlayerWrapper = memo(PlayerWrapperComponent);
