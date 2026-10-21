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

const multiCharacters = {
  Multi: [
    { name: "Abdul AlRahim", factions: ["Gruppe6", "Police"] },
    { name: "Una Listed", factions: ["Zeta", "Omega"] },
    { name: "Mixed Bag", factions: ["Zeta", "Casino", "Besties"] },
    { name: "Solo Sam", factions: ["Gruppe6"] },
  ],
};

void test("colours a matched character by their highest-priority faction", () => {
  const parseMulti = createKickStreamParser({
    npCharacters: multiCharacters,
    filterOrderTop: ["besties", "police", "casino", "gruppe6"],
  });
  const factionFor = (title: string) =>
    parseMulti(kick("Multi", title), { id: 1 }).faction;

  assert.equal(factionFor("Abdul on duty"), "police");
  assert.equal(factionFor("Una today"), "zeta");
  assert.equal(factionFor("Mixed today"), "besties");
  assert.equal(factionFor("Sam today"), "gruppe6");
  assert.deepEqual(
    parseMulti(kick("Multi", "Abdul on duty"), { id: 1 }).factions,
    ["gruppe6", "police", "whitelistnp"],
  );
});

void test("colours a matched character by their first faction without a priority order", () => {
  for (const filterOrderTop of [undefined, []]) {
    const parseMulti = createKickStreamParser({
      npCharacters: multiCharacters,
      filterOrderTop,
    });
    const factionFor = (title: string) =>
      parseMulti(kick("Multi", title), { id: 1 }).faction;

    assert.equal(factionFor("Abdul on duty"), "gruppe6");
    assert.equal(factionFor("Una today"), "zeta");
    assert.equal(factionFor("Mixed today"), "zeta");
    assert.equal(factionFor("Sam today"), "gruppe6");
  }
});
