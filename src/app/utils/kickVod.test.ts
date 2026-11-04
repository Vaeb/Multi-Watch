import { strict as assert } from "node:assert";
import test from "node:test";
import { kickVodUrl, parseKickTimestamp } from "./kickVod";

const CREATED_AT = "2026-11-04 14:55:08";
const VIDEO_ID = "01a1a714-5510-702f-a90f-84e713f21919";
const startedAt = Date.UTC(2026, 10, 4, 14, 55, 8);

const urlAt = (nowMs: number, createdAt = CREATED_AT, videoId = VIDEO_ID) =>
  kickVodUrl({
    channel: "absi",
    videoId,
    createdAt,
    nowMs,
  });

void test("rewinds a live VoD by 1.5 minutes in whole seconds", () => {
  assert.equal(
    urlAt(startedAt + 10 * 60 * 1000),
    `https://kick.com/absi/videos/${VIDEO_ID}?t=510`,
  );
  // 1.5s past that minute is truncated, not rounded up.
  assert.equal(
    urlAt(startedAt + 10 * 60 * 1000 + 1500),
    `https://kick.com/absi/videos/${VIDEO_ID}?t=511`,
  );
});

void test("clamps the offset to 0 when the stream is younger than 1.5 minutes", () => {
  assert.equal(
    urlAt(startedAt + 1 * 60 * 1000),
    `https://kick.com/absi/videos/${VIDEO_ID}?t=0`,
  );
  assert.equal(
    urlAt(startedAt + 1.5 * 60 * 1000),
    `https://kick.com/absi/videos/${VIDEO_ID}?t=0`,
  );
  assert.equal(
    urlAt(startedAt + 1.5 * 60 * 1000 + 1000),
    `https://kick.com/absi/videos/${VIDEO_ID}?t=1`,
  );
});

void test("returns no link when created_at or the video id is unusable", () => {
  const nowMs = startedAt + 10 * 60 * 1000;
  for (const createdAt of [
    "",
    "yesterday",
    "2026-11-04",
    "2026-11-04 14:55",
    "2026-13-04 14:55:08",
    "2026-02-31 00:00:00",
    "2026-11-04 14:55:08-05:00",
  ]) {
    assert.equal(urlAt(nowMs, createdAt), null, createdAt);
  }
  assert.equal(urlAt(nowMs, CREATED_AT, ""), null);
});

void test("parses Kick's zone-less created_at as UTC", () => {
  const utc = Date.UTC(2026, 10, 4, 14, 55, 8);
  assert.equal(parseKickTimestamp(CREATED_AT), utc);
  assert.equal(parseKickTimestamp("2026-11-04T14:55:08.000000Z"), utc);
  assert.equal(
    urlAt(utc + 10 * 60 * 1000, "2026-11-04T14:55:08.000000Z"),
    urlAt(utc + 10 * 60 * 1000, CREATED_AT),
  );

  const local = new Date(2026, 10, 4, 14, 55, 8).getTime();
  if (local !== utc) {
    assert.notEqual(parseKickTimestamp(CREATED_AT), local);
  }
});
