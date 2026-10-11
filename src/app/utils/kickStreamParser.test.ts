import { strict as assert } from "node:assert";
import test from "node:test";
import { type RemoteKickLivestream } from "../../types";
import { createKickStreamParser } from "./kickStreamParser";

const parse = createKickStreamParser({
  npCharacters: {
    TwitchName: [
      { name: "Jean Paul", factions: ["Alpha"] },
      { name: '[Deputy] Tommy "Tribs" Tribble', factions: ["Police"] },
    ],
  },
  npFactionsRegex: {
    alpha: "\\balpha\\b",
    beta: "\\bbeta\\b",
    police: "\\bcop\\b",
  },
  useColorsDark: { alpha: "#f00", beta: "#0f0", police: "#00f" },
  regNp: "\\bnopixel\\b|\\bnp\\b",
  regNpPublic: "\\bpublic\\b",
  regNpWhitelist: "\\bwhitelist\\b|\\bwl\\b",
  regNpInternational: "\\binternational\\b",
  regOthers: [{ name: "PurpleRP", reg: "\\bprp\\b", include: 1 }],
});

const kick = (channelName: string, title: string) =>
  ({
    channelName,
    session_title: title,
    viewers: 10,
    thumbnail: { src: "" },
  }) as RemoteKickLivestream;

void test("labels a stream with the character named in its title", () => {
  const stream = parse(kick("KickName", "NoPixel | Tribs on patrol"), {
    id: 1,
    twitch: "TwitchName",
    assumeFaction: ["alpha", "beta"],
  });

  assert.equal(stream.tagText, "《Deputy》Tribs");
  assert.equal(stream.characterName, '[Deputy] Tommy "Tribs" Tribble');
  assert.equal(stream.faction, "police");
  assert.equal(stream.rpServer, "NP");
  assert.equal(stream.platform, "kick");
  assert.deepEqual(stream.factions, ["police", "whitelistnp"]);
});

void test("guesses from assumed factions and keeps the stream in all of them", () => {
  const stream = parse(kick("KickName", "chill stream"), {
    id: 1,
    twitch: "TwitchName",
    assumeFaction: ["beta", "alpha"],
  });

  assert.equal(stream.tagText, "? Jean ?");
  assert.equal(stream.faction, "alpha");
  assert.ok(stream.factionsMap.alpha);
  assert.ok(stream.factionsMap.beta);
  assert.ok(stream.factionsMap.guessed);
});

void test("uses an assumed faction tag when no character matches it", () => {
  const stream = parse(kick("Stranger", "chill stream"), {
    id: 1,
    assumeFaction: ["beta", "unknownslug"],
  });

  assert.equal(stream.tagText, "〈beta〉");
  assert.deepEqual(stream.factions, ["beta", "guessed", "whitelistnp"]);
});

void test("falls back to Kick for unknown streamers", () => {
  const stream = parse(kick("Stranger", "chill stream"), { id: 1 });

  assert.equal(stream.tagText, "Kick");
  assert.equal(stream.characterName, null);
  assert.deepEqual(stream.factions, ["othernp", "whitelistnp"]);
});

void test("labels streams on other servers", () => {
  const stream = parse(kick("KickName", "PRP today"), {
    id: 1,
    twitch: "TwitchName",
  });

  assert.equal(stream.tagText, "::PurpleRP::");
  assert.equal(stream.rpServer, "PurpleRP");
  assert.equal(stream.noOthersInclude, false);
});
