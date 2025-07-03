export interface ChatroomsInfo {
  id: number;
  np?: boolean;
  assumeFaction?: string; // The faction slug that the Kick streamer belongs to
}

export interface PageParams {
  params: Promise<{
    slug: string[] | undefined;
  }>;
}

export type Platform = "twitch" | "kick";

export interface RemoteLive {
  streams: RemoteStream[];
  streamerData: Record<string, Partial<RemoteStream>>;
  tick: number;
  factionCount: Record<string, number>;
  npFactions: Record<string, number>;
  filterFactions: [string, string, boolean, number][]; // [slug, name, enabled, order]
  useColorsDark: Record<string, string>;
}

export interface RemoteStream {
  channelName: string;
  title: string;
  viewers: number;
  profileUrl: string;
  rpServer: string;
  characterName: string;
  nicknameLookup: string;
  faction: string;
  tagFaction: string;
  tagFactionSecondary?: string;
  tagText: string;
  factions: string[];
  factionsMap: Record<string, boolean>;
  noOthersInclude: boolean;
  noPublicInclude: boolean;
  noInternationalInclude: boolean;
  wlOverride: boolean;
  facebook: boolean;
}

export interface RemoteParsed {
  streams: RemoteStream[];
  filterFactions: RemoteLive["filterFactions"];
  useColorsDark: Record<string, string>;
}

export interface RemoteReceivedTwitch {
  parsed: RemoteParsed;
  time: number;
}

export interface RemoteReceived extends RemoteReceivedTwitch {
  needsKickLiveStreams: boolean; // Is the server's cache of kick streams outdated so it needs the next requesting client (this client) to fetch the kick streams itself and pass them back to the server to update its cache?
  chatrooms: Record<string, ChatroomsInfo>; // Chatrooms data from server, updated periodically
}

interface RemoteKickSubCategory {
  id: number;
  name: string;
  slug: string;
}

interface RemoteKickThumbnail {
  src: string;
  srcset: string;
}

export interface RemoteKickLivestream {
  id: number;
  channelName: string;
  session_title: string;
  created_at: string;
  viewers: number;
  playback_url: string;
  category: RemoteKickSubCategory;
  thumbnail: RemoteKickThumbnail;
}

export type RemoteKickLivestreamData = RemoteKickLivestream | null;

export interface CachedStreams {
  cachedTwitch: RemoteParsed;
  cachedTwitchTime: number;
}

export type GlobalData = typeof global &
  Partial<CachedStreams> & {
    cachedKickStreams: RemoteKickLivestream[];
    cachedKickTime: number;
    connected: number;
  };
