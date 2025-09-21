export const NOPIXEL_DATA_INTERVAL = 1000 * 60 * 5;

export const IS_LOCALHOST = process.env.IS_LOCALHOST === "1";

console.log("IS_LOCALHOST", IS_LOCALHOST);

export const LARGE_FACTIONS: Record<string, boolean> = {
  allnopixel: true,
  nponly: true,
  independent: true,
};

export const MIN_FOCUS_HEIGHT = 10;
export const MAX_FOCUS_HEIGHT = 90;
