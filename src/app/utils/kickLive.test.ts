import { strict as assert } from "node:assert";
import test from "node:test";
import { type RemoteKickLivestream } from "../../types";
import {
  mergeKickPoll,
  npKickChannels,
  parseLivestreamResponse,
  parseVodIdFromInfo,
  toKickLiveResponse,
  toKickLiveStream,
} from "./kickLive";

const stream = (
  channelName: string,
  viewers = 10,
  extras: Partial<RemoteKickLivestream> = {},
): RemoteKickLivestream => ({
  id: viewers,
  channelName,
  session_title: `NoPixel | ${channelName}`,
  created_at: "2026-11-04T13:28:41.000000Z",
  viewers,
  playback_url: `https://example.test/${channelName}.m3u8`,
  category: {
    id: 8,
    name: "Grand Theft Auto V (GTA)",
    slug: "grand-theft-auto-v",
  },
  thumbnail: {
    src: `https://example.test/${channelName}.webp`,
    srcset: "",
  },
  ...extras,
});

const liveJson = (viewers: number, id = viewers) =>
  JSON.stringify({
    data: {
      id,
      slug: "session-slug",
      session_title: "4HEAD | NOPIXEL 5.0 | TTS",
      created_at: "2026-11-04T13:28:41.000000Z",
      viewers,
      category: {
        id: 8,
        name: "Grand Theft Auto V (GTA)",
        slug: "grand-theft-auto-v",
      },
      thumbnail: { src: "https://images.kick.com/thumb.webp" },
      playback_url: "https://example.test/live.m3u8",
    },
  });

void test("np channels are the chatrooms marked np, in file order", () => {
  assert.deepEqual(
    npKickChannels({
      xQc: { np: true },
      Trainwreckstv: { np: false },
      "4HEAD": { np: true },
    }),
    ["xQc", "4HEAD"],
  );
});

void test("a live livestream body maps onto the stored stream", () => {
  const parsed = parseLivestreamResponse(
    "4HEAD",
    200,
    liveJson(4956, 135953803),
  );
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(parsed.stream, {
    id: 135953803,
    channelName: "4HEAD",
    session_title: "4HEAD | NOPIXEL 5.0 | TTS",
    created_at: "2026-11-04T13:28:41.000000Z",
    viewers: 4956,
    playback_url: "https://example.test/live.m3u8",
    category: {
      id: 8,
      name: "Grand Theft Auto V (GTA)",
      slug: "grand-theft-auto-v",
    },
    thumbnail: { src: "https://images.kick.com/thumb.webp", srcset: "" },
  });
});

void test("offline, non-200, non-JSON, and a short body are not a live stream", () => {
  const offline = parseLivestreamResponse(
    "xQc",
    200,
    JSON.stringify({ data: null }),
  );
  assert.deepEqual(offline, { channelName: "xQc", ok: true, stream: null });

  for (const [status, raw] of [
    [429, JSON.stringify({ data: null })],
    [200, "<html>challenge</html>"],
    [200, ""],
    [200, JSON.stringify({ error: true })],
    [200, JSON.stringify({ data: { id: 1, viewers: 3 } })],
    [200, "null"],
  ] as const) {
    const parsed = parseLivestreamResponse("Buddha", status, raw);
    assert.deepEqual(parsed, { channelName: "Buddha", ok: false }, raw);
  }
});

void test("vod id is read from a matching info livestream and ignored otherwise", () => {
  const raw = JSON.stringify({
    slug: "buddha",
    livestream: {
      id: 135993024,
      vod_id: "01a1a7bb-62b0-7942-9d55-1b96aaba0370",
    },
  });
  assert.equal(
    parseVodIdFromInfo(200, raw, 135993024),
    "01a1a7bb-62b0-7942-9d55-1b96aaba0370",
  );
  assert.equal(parseVodIdFromInfo(200, raw, 1), null);
  assert.equal(
    parseVodIdFromInfo(200, JSON.stringify({ livestream: null }), 1),
    null,
  );
  assert.equal(parseVodIdFromInfo(403, raw, 135993024), null);
  assert.equal(parseVodIdFromInfo(200, "nope", 135993024), null);
});

void test("a failed channel keeps its previous stream and a total failure writes nothing", () => {
  const previous = [stream("Buddha", 200), stream("Peppo", 50)];
  const kept = mergeKickPoll(previous, [
    { channelName: "Buddha", ok: false },
    parseLivestreamResponse("Peppo", 200, JSON.stringify({ data: null })),
    parseLivestreamResponse("Ming", 500, ""),
  ]);
  assert.ok(kept);
  assert.deepEqual(
    kept.map((entry) => entry.channelName),
    ["Buddha"],
  );
  assert.equal(kept[0], previous[0]);

  assert.equal(
    mergeKickPoll(previous, [
      { channelName: "Buddha", ok: false },
      { channelName: "Peppo", ok: false },
    ]),
    null,
  );
  assert.equal(mergeKickPoll(previous, []), null);
});

void test("a successful pass replaces live rows, drops offline rows, and sorts by viewers", () => {
  const previous = [
    stream("Buddha", 10, { id: 1, vodId: "old-vod" }),
    stream("Gone", 99),
  ];
  const buddha = parseLivestreamResponse("Buddha", 200, liveJson(20, 1));
  const head = parseLivestreamResponse("4HEAD", 200, liveJson(100, 7));
  assert.equal(buddha.ok && head.ok, true);
  if (!buddha.ok || !buddha.stream || !head.ok || !head.stream) return;

  const merged = mergeKickPoll(previous, [
    buddha,
    { channelName: "Peppo", ok: false },
    head,
  ]);
  assert.ok(merged);
  assert.deepEqual(
    merged.map((entry) => [entry.channelName, entry.viewers, entry.vodId]),
    [
      ["4HEAD", 100, undefined],
      ["Buddha", 20, "old-vod"],
    ],
  );
  assert.deepEqual(
    previous.map((entry) => entry.viewers),
    [10, 99],
  );
});

void test("a new livestream id does not reuse the previous vod id", () => {
  const merged = mergeKickPoll(
    [stream("Buddha", 10, { id: 1, vodId: "old-vod" })],
    [parseLivestreamResponse("Buddha", 200, liveJson(11, 2))],
  );
  assert.ok(merged);
  assert.equal(merged[0]?.vodId, undefined);
  assert.equal(merged[0]?.id, 2);
});

void test("the public stream shape uses Kick field names the other project asked for", () => {
  const withVod = toKickLiveStream(
    stream("Buddha", 20042, { id: 135993024, vodId: "vod-1" }),
  );
  assert.deepEqual(withVod, {
    channelName: "Buddha",
    title: "NoPixel | Buddha",
    viewers: 20042,
    startedAt: "2026-11-04T13:28:41.000000Z",
    category: "Grand Theft Auto V (GTA)",
    thumbnail: "https://example.test/Buddha.webp",
    playbackUrl: "https://example.test/Buddha.m3u8",
    id: 135993024,
    vodId: "vod-1",
  });

  const withoutVod = toKickLiveStream(stream("Ming", 83, { id: 5 }));
  assert.equal("vodId" in withoutVod, false);

  const savedAtMs = Date.UTC(2026, 10, 4, 20, 0, 0);
  const input = [stream("Ming", 83), stream("Buddha", 200)];
  const response = toKickLiveResponse(input, savedAtMs);
  assert.equal(response.savedAt, "2026-11-04T20:00:00.000Z");
  assert.deepEqual(
    response.streams.map((entry) => entry.channelName),
    ["Buddha", "Ming"],
  );
  assert.deepEqual(
    input.map((entry) => entry.channelName),
    ["Ming", "Buddha"],
  );
});
