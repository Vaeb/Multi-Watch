const shallowEqualObj = (
  a: Record<string, unknown>,
  b: Record<string, unknown>,
) => {
  if (a === b) return true;
  if (!a || !b) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => a[k] === b[k]);
};

export const areEqualObj =
  (objKey: string) =>
  (prev: Record<string, any>, next: Record<string, any>) => {
    if (!shallowEqualObj(prev[objKey], next[objKey])) return false;

    // React's default behaviour
    for (const key in prev) {
      if (key === objKey) continue;
      if (prev[key] !== next[key]) return false;
    }
    return true;
  };
