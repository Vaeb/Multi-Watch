import type { ChatroomsInfo, Platform, RemoteStream } from "../../types";

type StreamerKey = string & { readonly __brand: "StreamerKey" };

export const MULTI_PLATFORM_OPTIONS = [
  { value: "all", label: "Show all" },
  { value: "kick", label: "Prefer Kick" },
  { value: "twitch", label: "Prefer Twitch" },
] as const satisfies readonly { value: "all" | Platform; label: string }[];

export type MultiPlatformStreams =
  (typeof MULTI_PLATFORM_OPTIONS)[number]["value"];

export const MULTI_PLATFORM_DEFAULT = "all" satisfies MultiPlatformStreams;

export function kickStreamerKey(
  twitchOverride: string | undefined,
  kickChannelName: string,
): string {
  return (twitchOverride ?? kickChannelName).toLowerCase();
}

export function isMultiPlatformStreams(
  value: unknown,
): value is MultiPlatformStreams {
  return MULTI_PLATFORM_OPTIONS.some((option) => option.value === value);
}

export function preferenceOnFirstPaint(
  hasPainted: boolean,
  saved: MultiPlatformStreams,
): MultiPlatformStreams {
  if (!hasPainted) return MULTI_PLATFORM_DEFAULT;
  return saved;
}

function chatroomsLowerMap(chatrooms: Record<string, ChatroomsInfo>) {
  const chatroomsLower = new Map<string, ChatroomsInfo>();
  for (const [name, info] of Object.entries(chatrooms)) {
    chatroomsLower.set(name.toLowerCase(), info);
  }
  return chatroomsLower;
}

function personKey(
  stream: RemoteStream,
  chatroomsLower: Map<string, ChatroomsInfo>,
): StreamerKey {
  if (stream.platform === "kick") {
    return kickStreamerKey(
      chatroomsLower.get(stream.channelName.toLowerCase())?.twitch,
      stream.channelName,
    ) as StreamerKey;
  }
  return stream.channelName.toLowerCase() as StreamerKey;
}

function streamPlatform(stream: RemoteStream): Platform {
  return stream.platform ?? "twitch";
}

function dualLiveContext(
  liveStreams: RemoteStream[],
  chatrooms: Record<string, ChatroomsInfo>,
) {
  const chatroomsLower = chatroomsLowerMap(chatrooms);
  const liveOnKick = new Set<StreamerKey>();
  const liveOnTwitch = new Set<StreamerKey>();
  const viewersByPerson = new Map<StreamerKey, number>();
  for (const stream of liveStreams) {
    const key = personKey(stream, chatroomsLower);
    viewersByPerson.set(key, (viewersByPerson.get(key) ?? 0) + stream.viewers);
    if (streamPlatform(stream) === "kick") {
      liveOnKick.add(key);
    } else {
      liveOnTwitch.add(key);
    }
  }

  const liveOnBoth = new Set<StreamerKey>();
  for (const key of liveOnKick) {
    if (liveOnTwitch.has(key)) liveOnBoth.add(key);
  }

  return { chatroomsLower, liveOnBoth, viewersByPerson };
}

export function applyMultiPlatformStreams({
  liveStreams,
  chatrooms,
  preference,
}: {
  liveStreams: RemoteStream[];
  chatrooms: Record<string, ChatroomsInfo>;
  preference: MultiPlatformStreams;
}): RemoteStream[] {
  if (preference === "all") return liveStreams;

  const preferred: Platform = preference;
  const chatroomsLower = chatroomsLowerMap(chatrooms);

  const liveOnPreferred = new Set<StreamerKey>();
  for (const stream of liveStreams) {
    if (streamPlatform(stream) === preferred) {
      liveOnPreferred.add(personKey(stream, chatroomsLower));
    }
  }

  const filtered = liveStreams.filter((stream) => {
    if (streamPlatform(stream) === preferred) return true;
    return !liveOnPreferred.has(personKey(stream, chatroomsLower));
  });

  const count = displayedViewerCount({
    liveStreams,
    chatrooms,
    preference,
  });
  return filtered.sort((a, b) => count(b) - count(a));
}

// liveStreams must be the unfiltered live list. Preference already dropped the twin.
export function alsoLiveOnOtherPlatform({
  liveStreams,
  chatrooms,
  preference,
}: {
  liveStreams: RemoteStream[];
  chatrooms: Record<string, ChatroomsInfo>;
  preference: MultiPlatformStreams;
}): (stream: RemoteStream) => Platform | null {
  if (preference === "all") return () => null;

  const { chatroomsLower, liveOnBoth } = dualLiveContext(
    liveStreams,
    chatrooms,
  );
  const other: Platform = preference === "kick" ? "twitch" : "kick";

  return (stream) => {
    if (!liveOnBoth.has(personKey(stream, chatroomsLower))) return null;
    return other;
  };
}

export function displayedViewerCount({
  liveStreams,
  chatrooms,
  preference,
}: {
  liveStreams: RemoteStream[];
  chatrooms: Record<string, ChatroomsInfo>;
  preference: MultiPlatformStreams;
}): (stream: RemoteStream) => number {
  if (preference === "all") return (stream) => stream.viewers;

  const { chatroomsLower, liveOnBoth, viewersByPerson } = dualLiveContext(
    liveStreams,
    chatrooms,
  );

  return (stream) => {
    const key = personKey(stream, chatroomsLower);
    if (!liveOnBoth.has(key)) return stream.viewers;
    return viewersByPerson.get(key) ?? stream.viewers;
  };
}
