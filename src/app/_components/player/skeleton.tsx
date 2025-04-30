import { forwardRef, memo, useImperativeHandle, useState } from "react";

type SkeletonProps = {};

export interface SkeletonHandle {
  show(): void;
  hide(): void;
}

const SkeletonComponent = forwardRef<SkeletonHandle, SkeletonProps>(
  (_props, ref) => {
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

    return visible ? (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative ml-[1px] h-[30px] w-[30px]">
          <div className="absolute inset-0 rounded-full border-[4px] border-gray-700"></div>
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-b-transparent border-l-transparent border-r-transparent border-t-white"></div>
        </div>
      </div>
    ) : null;
  },
);

SkeletonComponent.displayName = "Skeleton";

export const Skeleton = memo(SkeletonComponent);
