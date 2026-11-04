// Kick's channel info returns created_at as "2026-11-04 14:55:08" with no
// timezone. The livestream endpoint returns the same instant as ISO-8601 UTC
// ("2026-11-04T14:55:08.000000Z"). Both are UTC. Date.parse treats the
// zone-less form as local time, which shifts the VoD offset on any machine
// that is not UTC.

const KICK_TIMESTAMP =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z?$/;

export const KICK_VOD_REWIND_SECONDS = 1.5 * 60;

export const parseKickTimestamp = (createdAt: string): number | null => {
  const match = KICK_TIMESTAMP.exec(createdAt.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }

  const parsed = Date.UTC(year, month - 1, day, hour, minute, second);
  const date = new Date(parsed);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return parsed;
};

// Opens kick.com/<channel>/videos/<videoId> at now minus 1.5 minutes.
// videoId is the channel info livestream.vod_id, not the numeric livestream id.
export const kickVodUrl = ({
  channel,
  videoId,
  createdAt,
  nowMs,
}: {
  channel: string;
  videoId: string;
  createdAt: string;
  nowMs: number;
}): string | null => {
  if (!channel || !videoId) return null;
  const startedAt = parseKickTimestamp(createdAt);
  if (startedAt == null || !Number.isFinite(nowMs)) return null;

  const elapsedSeconds = Math.floor(
    (nowMs - KICK_VOD_REWIND_SECONDS * 1000 - startedAt) / 1000,
  );
  const t = elapsedSeconds > 0 ? elapsedSeconds : 0;
  return `https://kick.com/${channel}/videos/${videoId}?t=${t}`;
};
