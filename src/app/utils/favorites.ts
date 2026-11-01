import { type Platform, type RemoteStream } from "../../types";

export type FavoriteKey = `${Platform}:${string}`;

export const FAVORITES_FILTER = "favorites";

export const favoriteKey = (platform: Platform, channel: string): FavoriteKey =>
  `${platform}:${channel.toLowerCase()}`;

export const filterFavoriteStreams = (
  streams: RemoteStream[],
  favorites: readonly FavoriteKey[],
) => {
  if (favorites.length === 0) return [];
  const favoriteSet = new Set(favorites);
  return streams.filter((stream) =>
    favoriteSet.has(
      favoriteKey(stream.platform ?? "twitch", stream.channelName),
    ),
  );
};
