import { strict as assert } from "node:assert";
import test from "node:test";
import { type KickOnDemandEntry, type RemoteKickLivestream } from "../../types";
import { parseLivestreamResponse, toKickLiveResponse } from "./kickLive";
import {
  decideKickChannel,
  isKickChannelSlug,
  KICK_ON_DEMAND_TTL_MS,
  loadKickOnDemand,
  toKickChannelView,
  type KickOnDemandDeps,
} from "./kickOnDemand";

const stream = (
  channelName: string,
  extras: Partial<RemoteKickLivestream> = {},
): RemoteKickLivestream => ({
  id: 135953803,
  channelName,
  session_title: `NoPixel | ${channelName}`,
  created_at: "2026-11-04T13:28:41.000000Z",
  viewers: 12,
  playback_url: `https://example.test/${channelName}.m3u8`,
  category: {
    id: 8,
    name: "Grand Theft Auto V (GTA)",
    slug: "grand-theft-auto-v",
  },
  thumbnail: { src: "https://example.test/thumb.webp", srcset: "" },
  vodId: "vod-from-livestream",
  ...extras,
});

const liveJson = () =>
  JSON.stringify({
    data: {
      id: 42,
      slug: "session-slug",
      session_title: "quick add",
      created_at: "2026-11-04T18:01:02.000000Z",
      viewers: 9,
      category: { id: 8, name: "Just Chatting", slug: "just-chatting" },
      thumbnail: { src: "https://example.test/thumb.webp" },
      playback_url: "https://example.test/quick.m3u8",
    },
  });

const harness = (
  now: () => number,
  fetchLivestream: KickOnDemandDeps["fetchLivestream"],
  fetchVodId?: KickOnDemandDeps["fetchVodId"],
) => {
  let stored: Record<string, KickOnDemandEntry> = {};
  const deps: KickOnDemandDeps = {
    now,
    store: {
      read: () => stored,
      write: (next) => {
        stored = next;
      },
    },
    inflight: new Map(),
    fetchLivestream,
    fetchVodId,
  };
  return { deps, read: () => stored };
};

void test("slug allowlist rejects short, spaced, long, and path slugs", () => {
  assert.equal(isKickChannelSlug("a"), false);
  assert.equal(isKickChannelSlug("has space"), false);
  assert.equal(isKickChannelSlug("a".repeat(26)), false);
  assert.equal(isKickChannelSlug("../etc"), false);
  assert.equal(isKickChannelSlug("ab"), true);
  assert.equal(isKickChannelSlug("Trainwreckstv"), true);
  assert.equal(isKickChannelSlug("Chidori-Senpai"), true);
});

void test("an invalid slug is rejected and never fetched", async () => {
  let calls = 0;
  const { deps } = harness(
    () => 0,
    () => {
      calls += 1;
      return Promise.resolve({ channelName: "x", ok: false });
    },
  );
  assert.deepEqual(decideKickChannel("../etc", [], {}, 0), { kind: "reject" });
  assert.equal(await loadKickOnDemand("../etc", deps), null);
  assert.equal(calls, 0);
});

void test("a NoPixel row wins over an on-demand row for the same slug", () => {
  const np = stream("Buddha", { vodId: "np-vod" });
  const onDemand = {
    buddha: { stream: stream("Buddha", { vodId: "other" }), fetchedAt: 0 },
  };
  assert.deepEqual(decideKickChannel("buddha", [np], onDemand, 10_000), {
    kind: "cached",
    stream: np,
  });
});

void test("a fresh on-demand row is reused and an old one is fetched again", () => {
  const row = stream("Trainwreckstv");
  const onDemand = { trainwreckstv: { stream: row, fetchedAt: 1_000 } };
  assert.deepEqual(
    decideKickChannel(
      "Trainwreckstv",
      [],
      onDemand,
      1_000 + KICK_ON_DEMAND_TTL_MS - 1,
    ),
    { kind: "cached", stream: row },
  );
  assert.equal(
    decideKickChannel("Trainwreckstv", [], onDemand, 1_000).kind,
    "cached",
  );
  const stale = decideKickChannel(
    "Trainwreckstv",
    [],
    onDemand,
    1_000 + KICK_ON_DEMAND_TTL_MS,
  );
  assert.equal(stale.kind, "fetch");
});

void test("an offline row inside the window stays cached as not live", () => {
  const onDemand = { trainwreckstv: { stream: null, fetchedAt: 5_000 } };
  assert.deepEqual(decideKickChannel("trainwreckstv", [], onDemand, 6_000), {
    kind: "cached",
    stream: null,
  });
});

void test("two concurrent loads share one livestream fetch", async () => {
  let calls = 0;
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const { deps, read } = harness(
    () => 10_000,
    async (slug) => {
      calls += 1;
      await gate;
      return parseLivestreamResponse(slug, 200, liveJson());
    },
  );
  const first = loadKickOnDemand("Trainwreckstv", deps);
  const second = loadKickOnDemand("trainwreckstv", deps);
  assert.equal(calls, 1);
  release();
  const [a, b] = await Promise.all([first, second]);
  assert.equal(a, b);
  assert.equal(
    read().trainwreckstv?.stream?.playback_url,
    "https://example.test/quick.m3u8",
  );
  assert.equal(calls, 1);
});

void test("a failed fetch records the window and blocks the next call", async () => {
  let calls = 0;
  const now = 20_000;
  const { deps } = harness(
    () => now,
    () => {
      calls += 1;
      return Promise.reject(new Error("network"));
    },
  );
  const first = await loadKickOnDemand("AdinRoss", deps);
  assert.equal(first?.stream, null);
  assert.equal(first?.fetchedAt, now);
  const second = await loadKickOnDemand("AdinRoss", deps);
  assert.equal(second, first);
  assert.equal(calls, 1);
});

void test("a failure keeps the previous stream and still blocks a refetch", async () => {
  const previous = stream("AdinRoss");
  let calls = 0;
  const { deps, read } = harness(
    () => KICK_ON_DEMAND_TTL_MS,
    () => {
      calls += 1;
      return Promise.resolve({ channelName: "AdinRoss", ok: false });
    },
  );
  deps.store.write({
    adinross: { stream: previous, fetchedAt: 0 },
  });
  const entry = await loadKickOnDemand("AdinRoss", deps);
  assert.equal(entry?.stream, previous);
  assert.equal(entry?.fetchedAt, KICK_ON_DEMAND_TTL_MS);
  await loadKickOnDemand("AdinRoss", deps);
  assert.equal(calls, 1);
  assert.equal(read().adinross?.stream, previous);
});

void test("a live row without vodId asks for one and the view uses livestream created_at", async () => {
  const { deps } = harness(
    () => 1,
    (slug) => Promise.resolve(parseLivestreamResponse(slug, 200, liveJson())),
    () => Promise.resolve("vod-from-info"),
  );
  const entry = await loadKickOnDemand("Trainwreckstv", deps);
  const view = toKickChannelView(entry?.stream);
  assert.equal(view.live, true);
  assert.equal(view.vodId, "vod-from-info");
  assert.equal(view.createdAt, "2026-11-04T18:01:02.000000Z");
  assert.equal(view.playbackUrl, "https://example.test/quick.m3u8");
});

void test("offline and missing playback are not a live view", () => {
  assert.deepEqual(toKickChannelView(null), {
    live: false,
    vodId: null,
    createdAt: null,
    playbackUrl: null,
  });
  assert.equal(
    toKickChannelView(stream("x", { playback_url: "" })).live,
    false,
  );
});

void test("an on-demand channel stays out of the public live list", () => {
  const np = [stream("Buddha")];
  const names = toKickLiveResponse(np, 1).streams.map((row) => row.channelName);
  assert.deepEqual(names, ["Buddha"]);
  const decision = decideKickChannel("Trainwreckstv", np, {}, 1);
  assert.equal(decision.kind, "fetch");
});
