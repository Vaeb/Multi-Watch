import { strict as assert } from "node:assert";
import test from "node:test";
import { type ChatroomsInfo, type RemoteStream } from "../../types";
import { getAssumeFactionColorSlug, getAssumeFactions } from "./assumeFaction";
import { filterNoPixelStreamsByFaction } from "./nopixelFilter";

const kickStream = (channelName: string) =>
  ({
    channelName,
    faction: "Kick",
    factionsMap: {},
  }) as RemoteStream;

const chatroomsLower = {
  multikick: {
    id: 1,
    assumeFaction: ["alpha", "beta"],
  },
  singlekick: {
    id: 2,
    assumeFaction: "alpha",
  },
  independentkick: {
    id: 3,
  },
} satisfies Record<string, ChatroomsInfo>;

void test("normalizes single and multiple assumed factions", () => {
  assert.deepEqual(getAssumeFactions("alpha"), ["alpha"]);
  assert.deepEqual(getAssumeFactions(["alpha", "beta"]), ["alpha", "beta"]);
  assert.deepEqual(getAssumeFactions(undefined), []);
});

void test("filters Kick streams by any assumed faction", () => {
  const streams = [
    kickStream("MultiKick"),
    kickStream("SingleKick"),
    kickStream("IndependentKick"),
  ];

  assert.deepEqual(
    filterNoPixelStreamsByFaction(streams, "alpha", chatroomsLower).map(
      (stream) => stream.channelName,
    ),
    ["MultiKick", "SingleKick"],
  );
  assert.deepEqual(
    filterNoPixelStreamsByFaction(streams, "beta", chatroomsLower).map(
      (stream) => stream.channelName,
    ),
    ["MultiKick"],
  );
});

void test("keeps unfiltered streams singular and independent streams separate", () => {
  const streams = [kickStream("MultiKick"), kickStream("IndependentKick")];

  assert.equal(
    filterNoPixelStreamsByFaction(streams, "allnopixel", chatroomsLower).filter(
      (stream) => stream.channelName === "MultiKick",
    ).length,
    1,
  );
  assert.deepEqual(
    filterNoPixelStreamsByFaction(streams, "independent", chatroomsLower).map(
      (stream) => stream.channelName,
    ),
    ["IndependentKick"],
  );
});

void test("uses the active matched faction as the color slug when present", () => {
  assert.equal(
    getAssumeFactionColorSlug(chatroomsLower.multikick, "beta"),
    "beta",
  );
  assert.equal(getAssumeFactionColorSlug(chatroomsLower.multikick), "alpha");
});
