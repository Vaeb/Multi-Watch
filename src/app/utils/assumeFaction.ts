import { type ChatroomsInfo } from "../../types";

export const getAssumeFactions = (
  assumeFaction: ChatroomsInfo["assumeFaction"] | undefined,
) => assumeFaction ?? [];
