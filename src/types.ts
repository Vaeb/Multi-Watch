export interface ChatroomsInfo {
  id: number;
  np?: boolean;
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
  filterFactions: [string, string, boolean, number][];
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
  needsKickLiveStreams: boolean;
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
  category: RemoteKickSubCategory;
  thumbnail: RemoteKickThumbnail;
}

export type RemoteKickLivestreamData = RemoteKickLivestream | null;
