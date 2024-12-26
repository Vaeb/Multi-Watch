/**
 * Shift interval time by x (close)
 */
export const shiftableInterval = (callback: () => void, _ms: number) => {
  let ms = _ms;
  const intervalRef: { current?: NodeJS.Timeout } = {};

  intervalRef.current = setInterval(callback, ms);

  const clear = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = undefined;
  };

  const shift = (newMs: number) => {
    ms = newMs;
    clear();
    intervalRef.current = setInterval(callback, ms);
  };

  const shiftOnce = (tempMs: number) => {
    clear();
    intervalRef.current = setInterval(() => {
      shift(ms);
      callback();
    }, tempMs);
  };

  return { clear, shift, shiftOnce };
};
