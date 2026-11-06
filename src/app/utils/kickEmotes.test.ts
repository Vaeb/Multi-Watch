import { strict as assert } from "node:assert";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { KickMessageContent } from "../_components/chat/kickEmoteText";
import {
  kickEmoteUrl,
  parseKickSevenTvSetId,
  parseKickUserId,
  parseSevenTvEmoteSet,
  segmentMessage,
  sevenTvEmoteUrl,
  type MessageSegment,
} from "./kickEmotes";

const plain = (segments: readonly MessageSegment[]): string => {
  let text = "";
  for (const segment of segments) {
    text += segment.kind === "text" ? segment.text : segment.name;
  }
  return text;
};

const namesOnly = (content: string): string =>
  content.replace(
    /\[emote:(\d+):([^\]]+)\]/g,
    (_match, _id, name: string) => name,
  );

const seventv = new Map<string, string>([
  ["KEKW", "https://cdn.7tv.app/emote/KEKW/2x.webp"],
  ["Pog", "https://cdn.7tv.app/emote/Pog/2x.webp"],
]);

void test("kick tokens at the start, middle, and end become images", () => {
  const content = "[emote:1:A] one [emote:2:B] two [emote:3:C]";
  assert.deepEqual(segmentMessage(content), [
    { kind: "emote", name: "A", url: kickEmoteUrl("1") },
    { kind: "text", text: " one " },
    { kind: "emote", name: "B", url: kickEmoteUrl("2") },
    { kind: "text", text: " two " },
    { kind: "emote", name: "C", url: kickEmoteUrl("3") },
  ]);
  assert.equal(plain(segmentMessage(content)), namesOnly(content));
});

void test("adjacent kick emotes stay together without an inserted space", () => {
  const content = "[emote:10:Cat][emote:11:Dog]";
  assert.deepEqual(segmentMessage(content), [
    { kind: "emote", name: "Cat", url: kickEmoteUrl("10") },
    { kind: "emote", name: "Dog", url: kickEmoteUrl("11") },
  ]);
  assert.equal(plain(segmentMessage(content)), "CatDog");
});

void test("segmenting the same message twice does not skip later tokens", () => {
  const content = "[emote:1:A] [emote:2:B]";
  const once = segmentMessage(content);
  const twice = segmentMessage(content);
  assert.deepEqual(once, twice);
  assert.equal(twice.filter((segment) => segment.kind === "emote").length, 2);
});

void test("7TV words match case-sensitively and unknown words stay text", () => {
  const content = "kekw KEKW PogChamp hello";
  assert.deepEqual(segmentMessage(content, seventv), [
    { kind: "text", text: "kekw " },
    {
      kind: "emote",
      name: "KEKW",
      url: "https://cdn.7tv.app/emote/KEKW/2x.webp",
    },
    { kind: "text", text: " PogChamp hello" },
  ]);
});

void test("punctuation and a lookalike name are not 7TV emotes", () => {
  const content = "Pog Pog! KEKW,";
  assert.deepEqual(segmentMessage(content, seventv), [
    {
      kind: "emote",
      name: "Pog",
      url: "https://cdn.7tv.app/emote/Pog/2x.webp",
    },
    { kind: "text", text: " Pog! KEKW," },
  ]);
});

void test("malformed kick tokens stay text and a later valid token still renders", () => {
  const samples = [
    "[emote:abc:KEKW]",
    "[emote:1:]",
    "[emote:1:name",
    "emote:1:KEKW]",
    "[emote::KEKW]",
  ];
  for (const sample of samples) {
    assert.deepEqual(segmentMessage(sample, seventv), [
      { kind: "text", text: sample },
    ]);
    assert.equal(plain(segmentMessage(sample, seventv)), namesOnly(sample));
  }
  const mixed = "[emote:nope:KEKW] [emote:4:OK]";
  assert.deepEqual(segmentMessage(mixed, seventv), [
    { kind: "text", text: "[emote:nope:KEKW] " },
    { kind: "emote", name: "OK", url: kickEmoteUrl("4") },
  ]);
});

void test("a kick token wins over a 7TV word with the same name", () => {
  const content = "hi [emote:5748004:KEKW] KEKW";
  assert.deepEqual(segmentMessage(content, seventv), [
    { kind: "text", text: "hi " },
    { kind: "emote", name: "KEKW", url: kickEmoteUrl("5748004") },
    { kind: "text", text: " " },
    {
      kind: "emote",
      name: "KEKW",
      url: "https://cdn.7tv.app/emote/KEKW/2x.webp",
    },
  ]);
  assert.equal(plain(segmentMessage(content, seventv)), namesOnly(content));
});

void test("whitespace between whole words is preserved", () => {
  const content = "KEKW  Pog\tKEKW\nnope";
  assert.deepEqual(segmentMessage(content, seventv), [
    {
      kind: "emote",
      name: "KEKW",
      url: "https://cdn.7tv.app/emote/KEKW/2x.webp",
    },
    { kind: "text", text: "  " },
    {
      kind: "emote",
      name: "Pog",
      url: "https://cdn.7tv.app/emote/Pog/2x.webp",
    },
    { kind: "text", text: "\t" },
    {
      kind: "emote",
      name: "KEKW",
      url: "https://cdn.7tv.app/emote/KEKW/2x.webp",
    },
    { kind: "text", text: "\nnope" },
  ]);
});

void test("7TV payloads keep the emote name and reject a bad id", () => {
  const globalSet = {
    id: "01HKQT8EWR000ESSWF3625XCS4",
    name: "Global Emotes",
    emotes: [
      {
        id: "01FCY771D800007PQ2DF3GDTN6",
        name: "RainTime",
        data: { id: "01FCY771D800007PQ2DF3GDTN6", name: "RainTime" },
      },
      { id: "not an id", name: "Broken" },
      { id: "01G3WEGZN0000ET2J0MQP5YJ0G", name: "" },
      { id: "ab/c", name: "Slashed" },
    ],
  };
  const parsedGlobal = parseSevenTvEmoteSet(globalSet);
  assert.equal(
    parsedGlobal?.get("RainTime"),
    "https://cdn.7tv.app/emote/01FCY771D800007PQ2DF3GDTN6/2x.webp",
  );
  assert.equal(parsedGlobal?.has("Broken"), false);
  assert.equal(parsedGlobal?.has("Slashed"), false);

  const graphql = {
    data: {
      emoteSet: {
        emotes: [
          {
            id: "01G3WEGZN0000ET2J0MQP5YJ0G",
            name: "GAMBA",
            data: { name: "other" },
          },
          {
            id: "01GCH1VX300004KGVJA52HCNPS",
            name: "PutAFingerDown",
            data: { name: "Me:" },
          },
        ],
      },
    },
  };
  const parsed = parseSevenTvEmoteSet(graphql);
  assert.equal(
    parsed?.get("GAMBA"),
    sevenTvEmoteUrl("01G3WEGZN0000ET2J0MQP5YJ0G"),
  );
  assert.equal(parsed?.has("other"), false);
  assert.equal(
    parsed?.get("PutAFingerDown"),
    sevenTvEmoteUrl("01GCH1VX300004KGVJA52HCNPS"),
  );
  assert.equal(parseSevenTvEmoteSet({ emotes: [] })?.size, 0);
  assert.equal(parseSevenTvEmoteSet({}), null);
  assert.equal(parseSevenTvEmoteSet(null), null);
});

void test("7TV parsing keeps distinct casings and lets a later duplicate win", () => {
  const parsed = parseSevenTvEmoteSet({
    emotes: [
      { id: "aaa", name: "MegaLUL" },
      { id: "bbb", name: "MEGALUL" },
      { id: "ccc", name: "MegaLUL" },
    ],
  });
  assert.equal(parsed?.get("MegaLUL"), sevenTvEmoteUrl("ccc"));
  assert.equal(parsed?.get("MEGALUL"), sevenTvEmoteUrl("bbb"));
});

void test("the Kick connection is the user id, not another platform", () => {
  const body = {
    data: {
      userByConnection: {
        id: "01FE9DRF000009TR6M9N941CYW",
        connections: [
          {
            id: "71092938",
            platform: "TWITCH",
            emote_set_id: "01FE9DRF000009TR6M9N941CYW",
          },
          {
            id: "676",
            platform: "KICK",
            emote_set_id: "01FE9DRF000009TR6M9N941CYW",
          },
        ],
      },
    },
  };
  assert.equal(parseKickSevenTvSetId(body, 676), "01FE9DRF000009TR6M9N941CYW");
  assert.equal(parseKickSevenTvSetId(body, 668), null);
  assert.equal(
    parseKickSevenTvSetId({ data: { userByConnection: null } }, 676),
    null,
  );
});

void test("emotes nested under emote_set on a user document are read", () => {
  const parsed = parseSevenTvEmoteSet({
    emote_set: {
      emotes: [{ id: "01FCY771D800007PQ2DF3GDTN6", name: "RainTime" }],
    },
  });
  assert.equal(
    parsed?.get("RainTime"),
    sevenTvEmoteUrl("01FCY771D800007PQ2DF3GDTN6"),
  );
});

void test("Kick user id is user_id, not the channel or chatroom id", () => {
  assert.equal(
    parseKickUserId({
      id: 668,
      user_id: 676,
      chatroom: { id: 668 },
      user: { id: 676, username: "xQc" },
    }),
    676,
  );
  assert.equal(parseKickUserId({ id: 875396, chatroom: { id: 875062 } }), null);
  assert.equal(parseKickUserId({ user: { id: 904404 } }), 904404);
  assert.equal(parseKickUserId({ user_id: 0 }), null);
  assert.equal(parseKickUserId({ user_id: 1.5 }), null);
  assert.equal(parseKickUserId({ user_id: "676" }), null);
});

void test("chat markup renders kick and 7TV emotes as images and leaves other words", () => {
  const content = "[emote:5748004:collectiblesGoldenNAHH] hello KEKW kekw";
  const emotes = new Map([
    ["KEKW", sevenTvEmoteUrl("01FCY771D800007PQ2DF3GDTN6") ?? ""],
  ]);
  const html = renderToStaticMarkup(
    createElement(KickMessageContent, { content, emotes }),
  );
  assert.ok(html.includes(`src="${kickEmoteUrl("5748004")}"`));
  assert.ok(html.includes('alt="collectiblesGoldenNAHH"'));
  assert.ok(html.includes('title="collectiblesGoldenNAHH"'));
  assert.ok(html.includes("height:2em"));
  assert.ok(
    html.includes(
      `src="${sevenTvEmoteUrl("01FCY771D800007PQ2DF3GDTN6") ?? ""}"`,
    ),
  );
  assert.ok(html.includes('alt="KEKW"'));
  assert.ok(html.includes("hello"));
  assert.ok(html.includes("kekw"));
  assert.equal(html.includes("[emote:"), false);
});
