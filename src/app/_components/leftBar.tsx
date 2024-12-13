"use client";

import { type PropsWithChildren } from "react";

export function LeftBar({ children }: PropsWithChildren) {
  return (
    <div className="absolute z-10 box-content flex w-[42px] pl-[2px] transition-all hover:w-[285px] hover:bg-[rgba(0,0,0,0.85)]">
      {children}
    </div>
  );
}
