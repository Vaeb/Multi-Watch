import { type MouseEventHandler } from "react";

export const noprop: MouseEventHandler<HTMLDivElement> = (e) => {
  e.stopPropagation();
};
