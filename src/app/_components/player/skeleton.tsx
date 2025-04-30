import {
  forwardRef,
  memo,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useStableCallback } from "~/app/hooks/useStableCallback";
import { useMainStore } from "~/app/stores/mainStore";
import { Platform } from "~/types";

type SkeletonProps = { channel: string; type: Platform };

export interface SkeletonHandle {
  show(): void;
  hide(): void;
}

const SkeletonComponent = forwardRef<SkeletonHandle, SkeletonProps>(
  ({ channel, type }, ref) => {
    const [visible, setVisible] = useState(true);

    // expose show() and hide() to the parent via ref
    useImperativeHandle(
      ref,
      () => ({
        show: () => setVisible(true),
        hide: () => setVisible(false),
      }),
      [],
    );

    const cell = useMainStore((state) => state.streamCells[channel]);
    const lastCell = useRef(cell);

    const isInitialCell = !lastCell.current ? cell : undefined;

    const getImageUrl = useStableCallback(() => {
      const { height, width } = cell ?? {};
      return height && width
        ? `https://static-cdn.jtvnw.net/previews-ttv/live_user_${channel.toLowerCase()}-${Math.round(Number.parseFloat(width))}x${Math.round(Number.parseFloat(height))}.jpg?nocache=${Date.now()}`
        : null;
    });

    const imageUrl = useMemo(() => {
      if (type === "kick") return null;
      return getImageUrl();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [channel, visible, isInitialCell]); // Only update image when channel, visible, or initial cell data

    lastCell.current = visible ? cell : undefined; // When the skeleton is hidden, reset the cell for future updates

    return visible ? (
      <>
        <div
          className="animate-pulse2 absolute inset-0"
          style={
            imageUrl
              ? {
                  backgroundImage: `url(${imageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : {}
          }
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative ml-[1px] h-[30px] w-[30px]">
            <div className="absolute inset-0 rounded-full border-[4px] border-gray-700"></div>
            <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-b-transparent border-l-transparent border-r-transparent border-t-white"></div>
          </div>
        </div>
      </>
    ) : null;
  },
);

SkeletonComponent.displayName = "Skeleton";

export const Skeleton = memo(SkeletonComponent);
