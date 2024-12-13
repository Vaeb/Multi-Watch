"use client";

import { type PropsWithChildren } from "react";

export function LeftBar({ children }: PropsWithChildren) {
  return (
    <div className="absolute z-10 flex h-[63%] max-h-[90vh] w-[60px]">
      {children}
    </div>
  );
}
