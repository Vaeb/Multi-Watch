import { strict as assert } from "node:assert";
import test from "node:test";
import { type RemoteKickLivestream } from "../../types";
import {
  applyKickPollBatch,
  backoffDelayMs,
  clientNeedsKickRefresh,
  KICK_FAILURE_RETAIN_MS,
  KICK_POLL_HEARTBEAT_FRESH_MS,
  mergeKickPoll,
  npKickChannels,
  orderKickPoll,
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

void test("a partial batch keeps a live row it has not checked", () => {
  const previous = [
    stream("Buddha", 200),
    stream("Unchecked", 40),
    stream("Peppo", 10),
  ];
  const merged = applyKickPollBatch(
    previous,
    [parseLivestreamResponse("Buddha", 200, JSON.stringify({ data: null }))],
    { dropUnmentioned: false, now: 1_000_000 },
  );
  assert.ok(merged);
  assert.deepEqual(
    merged.map((entry) => entry.channelName),
    ["Unchecked", "Peppo"],
  );
  assert.equal(
    merged.find((entry) => entry.channelName === "Unchecked"),
    previous[1],
  );
  assert.equal(
    merged.find((entry) => entry.channelName === "Peppo"),
    previous[2],
  );
});

void test("offline drops immediately even when that row was just fetched", () => {
  const now = 5_000_000;
  const previous = [
    stream("Buddha", 20, { fetchedAt: now }),
    stream("Other", 5, { fetchedAt: now }),
  ];
  const merged = applyKickPollBatch(
    previous,
    [parseLivestreamResponse("Buddha", 200, JSON.stringify({ data: null }))],
    { dropUnmentioned: false, now },
  );
  assert.ok(merged);
  assert.deepEqual(
    merged.map((entry) => entry.channelName),
    ["Other"],
  );
  assert.equal(merged[0], previous[1]);
});

void test("a failure-only row older than 15 minutes is dropped, and an all-fail batch writes nothing", () => {
  const now = 10_000_000_000;
  const old = stream("Buddha", 200, {
    fetchedAt: now - KICK_FAILURE_RETAIN_MS - 1,
  });
  const exact = stream("Exact", 30, {
    fetchedAt: now - KICK_FAILURE_RETAIN_MS,
  });
  const recent = stream("Peppo", 50, { fetchedAt: now - 1_000 });
  const unchecked = stream("Keep", 5);
  const ming = parseLivestreamResponse("Ming", 200, liveJson(9, 9));
  assert.equal(ming.ok, true);

  const merged = applyKickPollBatch(
    [old, exact, recent, unchecked],
    [
      { channelName: "Buddha", ok: false },
      { channelName: "Exact", ok: false },
      { channelName: "Peppo", ok: false },
      ming,
    ],
    { dropUnmentioned: false, now },
  );
  assert.ok(merged);
  assert.deepEqual(
    merged.map((entry) => entry.channelName),
    ["Peppo", "Exact", "Ming", "Keep"],
  );
  assert.equal(
    merged.find((entry) => entry.channelName === "Peppo"),
    recent,
  );
  assert.equal(
    merged.find((entry) => entry.channelName === "Exact"),
    exact,
  );
  assert.equal(
    merged.find((entry) => entry.channelName === "Ming")?.fetchedAt,
    now,
  );
  assert.equal(
    merged.find((entry) => entry.channelName === "Buddha"),
    undefined,
  );

  assert.equal(
    applyKickPollBatch([old], [{ channelName: "Buddha", ok: false }], {
      dropUnmentioned: false,
      now,
    }),
    null,
  );
});

void test("429 backoff uses a short Retry-After and otherwise climbs 5s, 10s, 20s, 30s", () => {
  const now = Date.parse("2026-11-04T20:00:00.000Z");
  assert.equal(backoffDelayMs("3", 4, now), 3_000);
  assert.equal(backoffDelayMs("0", 2, now), 10_000);
  assert.equal(backoffDelayMs("120", 1, now), 5_000);
  assert.equal(backoffDelayMs("nope", 1, now), 5_000);
  assert.equal(backoffDelayMs(null, 1, now), 5_000);
  assert.equal(backoffDelayMs(undefined, 2, now), 10_000);
  assert.equal(backoffDelayMs("", 3, now), 20_000);
  assert.equal(backoffDelayMs(null, 4, now), 30_000);
  assert.equal(backoffDelayMs(null, 9, now), 30_000);

  const soon = new Date(now + 10_000).toUTCString();
  assert.equal(backoffDelayMs(soon, 2, now), 10_000);
  const far = new Date(now + 120_000).toUTCString();
  assert.equal(backoffDelayMs(far, 2, now), 10_000);
  const past = new Date(now - 5_000).toUTCString();
  assert.equal(backoffDelayMs(past, 1, now), 5_000);
});

void test("previously live channels are polled first and unknown names stay out of the pass", () => {
  const ordered = orderKickPoll(
    ["A", "B", "C", "D"],
    [{ channelName: "c" }, { channelName: "A" }, { channelName: "Z" }],
  );
  assert.deepEqual(ordered.priority, ["C", "A"]);
  assert.deepEqual(ordered.rest, ["B", "D"]);
});

void test("a fresh poller heartbeat suppresses the client Kick refresh", () => {
  const now = 5_000_000;
  assert.equal(clientNeedsKickRefresh(false, now, now), false);
  assert.equal(
    clientNeedsKickRefresh(false, now - KICK_POLL_HEARTBEAT_FRESH_MS, now),
    false,
  );
  assert.equal(
    clientNeedsKickRefresh(false, now - KICK_POLL_HEARTBEAT_FRESH_MS - 1, now),
    true,
  );
  assert.equal(clientNeedsKickRefresh(false, 0, now), true);
  assert.equal(clientNeedsKickRefresh(true, 0, now), false);
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
