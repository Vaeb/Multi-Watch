export const NOPIXEL_DATA_INTERVAL = 1000 * 60 * 5;

export const IS_LOCALHOST = process.env.IS_LOCALHOST === "1";

export const LARGE_FACTIONS: Record<string, boolean> = {
  allnopixel: true,
  nponly: true,
  independent: true,
};
