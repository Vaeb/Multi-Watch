/**
 * Kick chat emotes.
 *
 * Kick sends native emotes as `[emote:<id>:<name>]` in the message text.
 * 7TV emotes are ordinary case-sensitive words. Stored message text stays
 * the original string; only the chat view turns these into images.
 */

export type EmoteMap = ReadonlyMap<string, string>;

export const EMPTY_EMOTE_MAP: EmoteMap = new Map();

export type MessageSegment =
  | { kind: "text"; text: string }
  | { kind: "emote"; name: string; url: string };

interface KickEmoteSpan {
  start: number;
  end: number;
  id: string;
  name: string;
}

const KICK_EMOTE_SOURCE = "\\[emote:(\\d+):([^\\]]+)\\]";
const SEVEN_TV_ID = /^[0-9A-Za-z]+$/;

export const kickEmoteUrl = (id: string): string =>
  `https://files.kick.com/emotes/${id}/fullsize`;

export const sevenTvEmoteUrl = (id: string): string | null => {
  if (!SEVEN_TV_ID.test(id)) return null;
  return `https://cdn.7tv.app/emote/${id}/2x.webp`;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isUnknownArray = (value: unknown): value is readonly unknown[] =>
  Array.isArray(value);

const positiveInt = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
};

/**
 * Kick user id for 7TV. This is `user_id` on the channel document, not the
 * channel id and not the chatroom id stored for Pusher (xQc's chatroom is
 * 668; the 7TV Kick connection is user 676).
 */
export const parseKickUserId = (body: unknown): number | null => {
  if (!isRecord(body)) return null;
  const userId = positiveInt(body.user_id);
  if (userId !== null) return userId;
  if (!isRecord(body.user)) return null;
  return positiveInt(body.user.id);
};

const splitKickEmotes = (
  content: string,
): { text: string; kickEmotes: KickEmoteSpan[] } => {
  if (!content.includes("[emote:")) return { text: content, kickEmotes: [] };
  const kickEmotes: KickEmoteSpan[] = [];
  let text = "";
  let last = 0;
  for (const match of content.matchAll(new RegExp(KICK_EMOTE_SOURCE, "g"))) {
    const index = match.index;
    const id = match[1];
    const name = match[2];
    if (index === undefined || id === undefined || name === undefined) continue;
    text += content.slice(last, index);
    const start = text.length;
    text += name;
    kickEmotes.push({ start, end: text.length, id, name });
    last = index + match[0].length;
  }
  text += content.slice(last);
  return { text, kickEmotes };
};

/**
 * Split a Kick message into text and emote segments.
 *
 * Kick tokens become Kick CDN images. The text around them is split on
 * whitespace, and each whole word is looked up in `thirdParty`
 * (case-sensitive). A Kick token wins over a 7TV word of the same name.
 * Joining segment text and emote names reproduces the message with tokens
 * replaced by emote names.
 */
export const segmentMessage = (
  content: string,
  thirdParty: EmoteMap = EMPTY_EMOTE_MAP,
): MessageSegment[] => {
  const split = splitKickEmotes(content);
  return segmentChatText(split.text, split.kickEmotes, thirdParty);
};

const segmentChatText = (
  text: string,
  kickEmotes: readonly KickEmoteSpan[],
  thirdParty: EmoteMap,
): MessageSegment[] => {
  if (kickEmotes.length === 0 && thirdParty.size === 0) {
    return text.length === 0 ? [] : [{ kind: "text", text }];
  }
  const segments: MessageSegment[] = [];
  let cursor = 0;
  for (const span of kickEmotes) {
    if (
      span.start < cursor ||
      span.end <= span.start ||
      span.end > text.length
    ) {
      continue;
    }
    if (!/^\d+$/.test(span.id)) continue;
    if (span.start > cursor) {
      appendThirdParty(segments, text.slice(cursor, span.start), thirdParty);
    }
    segments.push({
      kind: "emote",
      name: span.name,
      url: kickEmoteUrl(span.id),
    });
    cursor = span.end;
  }
  if (cursor < text.length)
    appendThirdParty(segments, text.slice(cursor), thirdParty);
  return segments;
};

const appendThirdParty = (
  segments: MessageSegment[],
  text: string,
  thirdParty: EmoteMap,
): void => {
  if (text.length === 0) return;
  if (thirdParty.size === 0) {
    pushText(segments, text);
    return;
  }
  for (const part of text.split(/(\s+)/)) {
    if (part.length === 0) continue;
    if (/^\s+$/.test(part)) {
      pushText(segments, part);
      continue;
    }
    const url = thirdParty.get(part);
    if (url === undefined) pushText(segments, part);
    else segments.push({ kind: "emote", name: part, url });
  }
};

const pushText = (segments: MessageSegment[], text: string): void => {
  const last = segments[segments.length - 1];
  if (last && last.kind === "text") last.text += text;
  else segments.push({ kind: "text", text });
};

const readEmote = (entry: unknown, into: Map<string, string>): void => {
  if (!isRecord(entry)) return;
  const name = entry.name;
  const id = entry.id;
  if (typeof name !== "string" || name.length === 0 || /\s/.test(name)) return;
  if (typeof id !== "string") return;
  const url = sevenTvEmoteUrl(id);
  if (url === null) return;
  into.set(name, url);
};

const emoteArray = (body: unknown): readonly unknown[] | null => {
  if (!isRecord(body)) return null;
  if (isUnknownArray(body.emotes)) return body.emotes;
  if (isRecord(body.emote_set) && isUnknownArray(body.emote_set.emotes)) {
    return body.emote_set.emotes;
  }
  const data = isRecord(body.data) ? body.data : null;
  if (data && isRecord(data.emoteSet) && isUnknownArray(data.emoteSet.emotes)) {
    return data.emoteSet.emotes;
  }
  return null;
};

/**
 * Reads a 7TV emote set, a user document, or a v3 GraphQL `emoteSet`.
 * Returns null when the body is not an emote set, so a bad payload is not
 * stored as an empty set.
 */
export const parseSevenTvEmoteSet = (
  body: unknown,
): Map<string, string> | null => {
  const emotes = emoteArray(body);
  if (!emotes) return null;
  const map = new Map<string, string>();
  for (const entry of emotes) readEmote(entry, map);
  return map;
};

/** Active emote set id for one Kick user from `userByConnection`. */
export const parseKickSevenTvSetId = (
  body: unknown,
  kickUserId: number,
): string | null => {
  if (!isRecord(body)) return null;
  const data = isRecord(body.data) ? body.data : body;
  if (!isRecord(data)) return null;
  const user = data.userByConnection;
  if (!isRecord(user) || !isUnknownArray(user.connections)) return null;
  const want = String(kickUserId);
  for (const connection of user.connections) {
    if (!isRecord(connection)) continue;
    if (
      typeof connection.platform !== "string" ||
      connection.platform.toUpperCase() !== "KICK"
    ) {
      continue;
    }
    const rawId = connection.id;
    const idText = typeof rawId === "number" ? String(rawId) : rawId;
    if (idText !== want) continue;
    const setId = connection.emote_set_id;
    if (typeof setId === "string" && SEVEN_TV_ID.test(setId)) return setId;
  }
  return null;
};
