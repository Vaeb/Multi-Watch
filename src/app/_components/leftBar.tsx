"use client";

import { type PropsWithChildren } from "react";

export function LeftBar({ children }: PropsWithChildren) {
  return (
    <div className="group absolute z-10 box-content flex w-[42px] overflow-hidden pl-[2px] pr-[4px] transition-all duration-75 hover:w-[228px] hover:bg-[rgba(0,0,0,0.85)]">
      {children}
    </div>
  );
}
