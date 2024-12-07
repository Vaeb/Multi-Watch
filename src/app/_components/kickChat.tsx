"use client";

import { memo } from "react";
import { useKickClient } from "../kickClient/useKickClient";

export interface ChatProps {
  channel: string;
}

function KickChatComponent({ channel }: ChatProps) {
  // const chatClient = useKickClient(channel);

  return null;
}

export const KickChat = memo(KickChatComponent);
