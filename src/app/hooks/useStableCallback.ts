import { useCallback, useRef } from "react";

export function useStableCallback<T extends Array<unknown>, R>(
  callback: (...args: T) => R,
): (...args: T) => R {
  const callbackRef = useRef<(...args: T) => R>(null);

  // @ts-expect-error qqq
  callbackRef.current = callback;

  return useCallback((...args) => {
    return callbackRef.current!(...args);
  }, []);
}
