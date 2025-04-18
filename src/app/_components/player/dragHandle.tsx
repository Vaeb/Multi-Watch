"use client";

import { memo } from "react";
import { useMainStore } from "../../stores/mainStore";
import clsx from "clsx";
import { useDrag } from "./dragContext";

interface DragHandleProps {
  channel: string;
}

function DragHandleComponent({ channel }: DragHandleProps) {
  const { startDrag } = useDrag();
  const isDragging = useMainStore((state) => state.isDragging);
  const dragChannel = useMainStore((state) => state.dragChannel);

  const isDraggingThis = isDragging && dragChannel === channel;

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startDrag(channel, e.clientX, e.clientY);
  };

  return (
    <div
      className={clsx(
        "absolute inset-x-0 bottom-[64px] top-[35%] pt-8 transition-all duration-150",
        "bg-white/20 opacity-0",
        // "active:cursor-grabbing active:opacity-15",
        isDraggingThis ? "cursor-grabbing" : "cursor-grab",
      )}
      onMouseDown={onMouseDown}
      data-drag-handle={channel}
    />
  );
}

export const DragHandle = memo(DragHandleComponent);
