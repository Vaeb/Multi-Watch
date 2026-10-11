import { strict as assert } from "node:assert";
import test from "node:test";
import { type RemoteStream } from "../../types";
import { getAssumeFactions } from "./assumeFaction";
import { filterNoPixelStreamsByFaction } from "./nopixelFilter";

const stream = (
  channelName: string,
  factions: string[],
  extra: Partial<RemoteStream> = {},
) =>
  ({
    channelName,
    rpServer: "NP",
    faction: factions[0],
    factions,
    factionsMap: Object.fromEntries(factions.map((faction) => [faction, true])),
    ...extra,
  }) as RemoteStream;

const names = (streams: RemoteStream[]) =>
  streams.map((stream) => stream.channelName);

void test("normalizes optional and multiple assumed factions", () => {
  assert.deepEqual(getAssumeFactions(["alpha"]), ["alpha"]);
  assert.deepEqual(getAssumeFactions(["alpha", "beta"]), ["alpha", "beta"]);
  assert.deepEqual(getAssumeFactions(undefined), []);
});

void test("filters streams by any of their factions", () => {
  const streams = [
    stream("Multi", ["alpha", "guessed", "beta"]),
    stream("Single", ["alpha", "guessed"]),
    stream("Unknown", ["othernp"]),
  ];

  assert.deepEqual(names(filterNoPixelStreamsByFaction(streams, "alpha")), [
    "Multi",
    "Single",
  ]);
  assert.deepEqual(names(filterNoPixelStreamsByFaction(streams, "beta")), [
    "Multi",
  ]);
});

void test("keeps unfiltered streams singular and independent streams separate", () => {
  const streams = [
    stream("Multi", ["alpha", "beta"]),
    stream("Unknown", ["othernp"]),
    stream("Indie", ["independent"]),
  ];

  assert.deepEqual(
    names(filterNoPixelStreamsByFaction(streams, "allnopixel")),
    ["Multi", "Unknown", "Indie"],
  );
  assert.deepEqual(
    names(filterNoPixelStreamsByFaction(streams, "independent")),
    ["Unknown", "Indie"],
  );
});

void test("filters by server", () => {
  const streams = [
    stream("Whitelist", ["alpha"]),
    stream("Public", ["alpha"], { tagFactionSecondary: "publicnp" }),
    stream("Other", ["other"], { rpServer: "PurpleRP" }),
  ];

  assert.deepEqual(names(filterNoPixelStreamsByFaction(streams, "nponly")), [
    "Whitelist",
    "Public",
  ]);
  assert.deepEqual(names(filterNoPixelStreamsByFaction(streams, "publicnp")), [
    "Public",
  ]);
});
