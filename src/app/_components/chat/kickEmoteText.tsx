"use client";

import React, { createContext, useContext, useState } from "react";
import {
  EMPTY_EMOTE_MAP,
  segmentMessage,
  type EmoteMap,
} from "../../utils/kickEmotes";

export const KickEmoteContext = createContext<EmoteMap>(EMPTY_EMOTE_MAP);

function EmoteImage({ name, url }: { name: string; url: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return name;
  return (
    // 2em tall, and a failed load shows the name. next/image's optimizer does not fit that.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name}
      title={name}
      draggable={false}
      decoding="async"
      loading="lazy"
      // Tailwind preflight sets img { display: block }, which drops the
      // emote onto its own line. inline-block keeps it in the text flow.
      style={{
        display: "inline-block",
        height: "2em",
        width: "auto",
        verticalAlign: "middle",
      }}
      onError={() => {
        setFailed(true);
      }}
    />
  );
}

export function KickMessageContent({
  content,
  emotes,
}: {
  content: string;
  emotes?: EmoteMap;
}) {
  const contextEmotes = useContext(KickEmoteContext);
  const segments = segmentMessage(content, emotes ?? contextEmotes);
  const only = segments.length === 1 ? segments[0] : undefined;
  if (only?.kind === "text") return only.text;
  return segments.map((segment, index) =>
    segment.kind === "text" ? (
      <span key={index}>{segment.text}</span>
    ) : (
      <EmoteImage
        key={`${segment.url}:${String(index)}`}
        name={segment.name}
        url={segment.url}
      />
    ),
  );
}
