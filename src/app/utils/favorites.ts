import { type Platform, type RemoteStream } from "../../types";
import { isNoPixelStreamAllowed } from "./nopixelFilter";

export type FavoriteKey = `${Platform}:${string}`;

export const FAVORITES_FILTER = "favorites";

export const favoriteKey = (platform: Platform, channel: string): FavoriteKey =>
  `${platform}:${channel.toLowerCase()}`;

// A stream shows if its channel is favorited or it belongs to a favorited faction
export const filterFavoriteStreams = (
  streams: RemoteStream[],
  favorites: readonly FavoriteKey[],
  favoriteFactions: readonly string[] = [],
) => {
  if (favorites.length === 0 && favoriteFactions.length === 0) return [];
  const favoriteSet = new Set(favorites);
  return streams.filter(
    (stream) =>
      favoriteSet.has(
        favoriteKey(stream.platform ?? "twitch", stream.channelName),
      ) ||
      favoriteFactions.some((faction) =>
        isNoPixelStreamAllowed(faction, stream),
      ),
  );
};
