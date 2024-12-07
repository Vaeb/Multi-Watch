"use client";

import { createClient } from "@retconned/kick-js";
import { useEffect, useState } from "react";

let a = 1;

export const useKickClient = (channel: string) => {
  console.log(`Creating kick chat client for ${channel}`);
  const [kickClient, setKickClient] = useState<ReturnType<
    typeof createClient
  > | null>(null);

  useEffect(() => {
    const client = createClient(channel, { logger: true });
    setKickClient(client);

    client.on("ready", () => {
      console.log(`Kick chat client ready for ${channel}`);
    });

    client.on("ChatMessage", (message) => {
      console.log(
        `[Chat-${channel}] ${message.sender.username}: ${message.content}`,
      );
    });

    return () => {
      console.log(
        `Unmounting ${channel} kick chat - would try to destroy client but cannot.`,
      );
    };
  }, [channel]);

  // client.login({  })

  return kickClient;
};
