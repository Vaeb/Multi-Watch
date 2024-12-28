/**
 * min and max inclusive
 */
export const makeNumsInterval = (min: number, max: number, interval: number) =>
  Array.from(
    { length: (max - min) / interval + 1 },
    (_, i) => min + i * interval,
  );
