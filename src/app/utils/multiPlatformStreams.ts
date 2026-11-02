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
  const chatroomsLower = new Map<string, ChatroomsInfo>();
  for (const [name, info] of Object.entries(chatrooms)) {
    chatroomsLower.set(name.toLowerCase(), info);
  }

  const personKey = (stream: RemoteStream): StreamerKey => {
    if (stream.platform === "kick") {
      return kickStreamerKey(
        chatroomsLower.get(stream.channelName.toLowerCase())?.twitch,
        stream.channelName,
      ) as StreamerKey;
    }
    return stream.channelName.toLowerCase() as StreamerKey;
  };

  const liveOnPreferred = new Set<StreamerKey>();
  for (const stream of liveStreams) {
    if ((stream.platform ?? "twitch") === preferred) {
      liveOnPreferred.add(personKey(stream));
    }
  }

  return liveStreams.filter((stream) => {
    if ((stream.platform ?? "twitch") === preferred) return true;
    return !liveOnPreferred.has(personKey(stream));
  });
}
