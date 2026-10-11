import { type ChatroomsInfo } from "../../types";

export const getAssumeFactions = (
  assumeFaction: ChatroomsInfo["assumeFaction"] | undefined,
) => assumeFaction ?? [];

export const hasAssumeFaction = (
  chatroom: ChatroomsInfo | undefined,
  factionSlug: string,
) => getAssumeFactions(chatroom?.assumeFaction).includes(factionSlug);

export const hasAnyAssumeFaction = (chatroom: ChatroomsInfo | undefined) =>
  getAssumeFactions(chatroom?.assumeFaction).length > 0;

export const getAssumeFactionColorSlug = (
  chatroom: ChatroomsInfo | undefined,
  preferredFactionSlug?: string,
) => {
  const assumeFactions = getAssumeFactions(chatroom?.assumeFaction);

  if (preferredFactionSlug && assumeFactions.includes(preferredFactionSlug)) {
    return preferredFactionSlug;
  }

  return assumeFactions[0];
};
