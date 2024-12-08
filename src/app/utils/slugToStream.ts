import { type Platform } from "~/types";
import { type Stream } from "../stores/storeTypes";

export const slugToStream = (slug: string): Stream => {
  let type: Platform = "twitch";
  if (slug.endsWith("-k")) {
    slug = slug.slice(0, -2);
    type = "kick";
  }
  return { value: slug, type };
};
