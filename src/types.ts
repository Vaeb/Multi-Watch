import { type KickStreamParser } from "./app/utils/kickStreamParser";

export interface ChatroomsInfo {
  id: number;
  np?: boolean;
  assumeFaction?: string[]; // Faction slug(s) that the Kick streamer belongs to
  twitch?: string; // The streamer's Twitch channel, if its name differs, used to look up their NoPixel characters
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
  platform?: Platform; // Only set for Kick streams
  rpServer: string | null;
  characterName: string | null;
  nicknameLookup: string | null;
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
  kickSavedAt: number;
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
  // From the channel info endpoint, cached while this livestream id is current.
  vodId?: string;
  // Last successful livestream response for this channel, in ms. A failure
  // keeps the previous value. Unset means this process has not confirmed it.
  fetchedAt?: number;
}

export type RemoteKickLivestreamData = RemoteKickLivestream | null;

// A channel the poller does not track, fetched because someone opened it.
// Kept off cachedKickStreams so GET /api/kick-live stays the NoPixel list.
export interface KickOnDemandEntry {
  stream: RemoteKickLivestream | null;
  fetchedAt: number;
}

export type AssumeServer = "whitelist" | "public" | "international";

export interface RemoteTnoCharacter {
  name: string;
  factions?: string[];
  displayName?: number;
  nicknames?: string[];
  leader?: boolean;
  assumeServer?: AssumeServer;
  assumeChar?: boolean;
}

// NoPixel character and title-matching data from TNO-Backend's /tno_data (regexes are serialized as their sources)
export interface RemoteTnoData {
  npCharacters: Record<string, RemoteTnoCharacter[]>;
  npFactionsRegex: Record<string, string>;
  greaterFactions: Record<string, boolean>;
  lesserFactions: Record<string, boolean>;
  serverTwoFactions: Record<string, boolean>;
  useColorsDark: Record<string, string>;
  regNp: string;
  regNpPublic: string;
  regNpWhitelist: string;
  regNpInternational: string;
  regOthers: { name: string; reg: string; include: number }[];
  filterOrderTop: string[];
}

export interface CachedStreams {
  cachedTwitch: RemoteParsed;
  cachedTwitchTime: number;
}

export type GlobalData = typeof global &
  Partial<CachedStreams> & {
    cachedKickStreams: RemoteKickLivestream[];
    cachedKickTime: number;
    kickInitPromise?: Promise<void>;
    kickServerInit?: Promise<void>;
    kickBackgroundStarted?: boolean;
    kickPollerStarted?: boolean;
    // Touched on each poll request. While it is fresh, browsers are not asked
    // to scan Kick even if the saved list is past the usual refresh window.
    kickPollHeartbeat?: number;
    kickOnDemand?: Record<string, KickOnDemandEntry>;
    kickOnDemandInflight?: Map<string, Promise<KickOnDemandEntry>>;
    // Shared by the startup bundle and the request bundle. The first Twitch
    // fetch resolves it; a request that arrives first waits on the same promise.
    twitchReady?: Promise<CachedStreams>;
    resolveTwitch?: (value: CachedStreams) => void;
    kickStreamParser?: KickStreamParser;
    connected: number;
  };
