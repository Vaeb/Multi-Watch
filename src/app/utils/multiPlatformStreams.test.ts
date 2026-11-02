import { strict as assert } from "node:assert";
import test from "node:test";
import {
  type ChatroomsInfo,
  type Platform,
  type RemoteStream,
} from "../../types";
import { favoriteKey, filterFavoriteStreams } from "./favorites";
import {
  applyMultiPlatformStreams,
  kickStreamerKey,
  preferenceOnFirstPaint,
} from "./multiPlatformStreams";

const stream = (channelName: string, platform?: Platform) =>
  ({
    channelName,
    platform,
  }) as RemoteStream;

const room = (twitch?: string): ChatroomsInfo => ({
  id: 1,
  ...(twitch === undefined ? {} : { twitch }),
});

const shown = (streams: RemoteStream[]) =>
  streams.map((row) => ({
    channelName: row.channelName,
    platform: row.platform ?? "twitch",
  }));

void test("show all returns the same array", () => {
  const liveStreams = [stream("xQc", "kick"), stream("xQc"), stream("other")];
  const result = applyMultiPlatformStreams({
    liveStreams,
    chatrooms: { xQc: room() },
    preference: "all",
  });
  assert.equal(result, liveStreams);
});

void test("prefer Kick hides the Twitch row when that person is also live on Kick", () => {
  const liveStreams = [
    stream("before"),
    stream("xQc"),
    stream("between"),
    stream("xQc", "kick"),
    stream("after"),
  ];
  const result = applyMultiPlatformStreams({
    liveStreams,
    chatrooms: { xQc: room() },
    preference: "kick",
  });

  assert.deepEqual(shown(result), [
    { channelName: "before", platform: "twitch" },
    { channelName: "between", platform: "twitch" },
    { channelName: "xQc", platform: "kick" },
    { channelName: "after", platform: "twitch" },
  ]);
  assert.equal(result[2], liveStreams[3]);
  assert.deepEqual(shown(liveStreams), [
    { channelName: "before", platform: "twitch" },
    { channelName: "xQc", platform: "twitch" },
    { channelName: "between", platform: "twitch" },
    { channelName: "xQc", platform: "kick" },
    { channelName: "after", platform: "twitch" },
  ]);
});

void test("prefer Twitch hides the Kick row when that person is also live on Twitch", () => {
  const liveStreams = [
    stream("before"),
    stream("xQc"),
    stream("between"),
    stream("xQc", "kick"),
    stream("after"),
  ];
  const result = applyMultiPlatformStreams({
    liveStreams,
    chatrooms: { xQc: room() },
    preference: "twitch",
  });

  assert.deepEqual(shown(result), [
    { channelName: "before", platform: "twitch" },
    { channelName: "xQc", platform: "twitch" },
    { channelName: "between", platform: "twitch" },
    { channelName: "after", platform: "twitch" },
  ]);
  assert.equal(result[1], liveStreams[1]);
});

void test("prefer Kick keeps a Twitch row when that person is not live on Kick", () => {
  const liveStreams = [stream("xQc"), stream("someone", "kick")];
  const result = applyMultiPlatformStreams({
    liveStreams,
    chatrooms: { xQc: room() },
    preference: "kick",
  });

  assert.deepEqual(shown(result), [
    { channelName: "xQc", platform: "twitch" },
    { channelName: "someone", platform: "kick" },
  ]);
});

void test("prefer Kick pairs Kick MaximusBlack with Twitch LAGTVMaximusBlack and keeps a different Twitch MaximusBlack", () => {
  const liveStreams = [
    stream("LAGTVMaximusBlack"),
    stream("other"),
    stream("MaximusBlack"),
    stream("MaximusBlack", "kick"),
  ];
  const result = applyMultiPlatformStreams({
    liveStreams,
    chatrooms: { MaximusBlack: room("LAGTVMaximusBlack") },
    preference: "kick",
  });

  assert.deepEqual(shown(result), [
    { channelName: "other", platform: "twitch" },
    { channelName: "MaximusBlack", platform: "twitch" },
    { channelName: "MaximusBlack", platform: "kick" },
  ]);
  assert.equal(result[1], liveStreams[2]);
  assert.equal(result[2], liveStreams[3]);
});

void test("prefer Twitch drops Kick MaximusBlack and keeps Twitch LAGTVMaximusBlack", () => {
  const liveStreams = [
    stream("LAGTVMaximusBlack"),
    stream("other"),
    stream("MaximusBlack"),
    stream("MaximusBlack", "kick"),
  ];
  const result = applyMultiPlatformStreams({
    liveStreams,
    chatrooms: { MaximusBlack: room("LAGTVMaximusBlack") },
    preference: "twitch",
  });

  assert.deepEqual(shown(result), [
    { channelName: "LAGTVMaximusBlack", platform: "twitch" },
    { channelName: "other", platform: "twitch" },
    { channelName: "MaximusBlack", platform: "twitch" },
  ]);
});

void test("a person live only on the non-preferred platform stays", () => {
  const liveStreams = [stream("onlyKick", "kick"), stream("onlyTwitch")];
  const chatrooms = {
    onlyKick: room(),
    onlyTwitch: room(),
  };

  assert.deepEqual(
    shown(
      applyMultiPlatformStreams({
        liveStreams,
        chatrooms,
        preference: "kick",
      }),
    ),
    [
      { channelName: "onlyKick", platform: "kick" },
      { channelName: "onlyTwitch", platform: "twitch" },
    ],
  );
  assert.deepEqual(
    shown(
      applyMultiPlatformStreams({
        liveStreams,
        chatrooms,
        preference: "twitch",
      }),
    ),
    [
      { channelName: "onlyKick", platform: "kick" },
      { channelName: "onlyTwitch", platform: "twitch" },
    ],
  );
});

void test("a second call keeps the same channel names in the same order", () => {
  const liveStreams = [
    stream("before"),
    stream("xQc"),
    stream("xQc", "kick"),
    stream("after"),
  ];
  const chatrooms = { xQc: room() };
  const once = applyMultiPlatformStreams({
    liveStreams,
    chatrooms,
    preference: "kick",
  });
  const twice = applyMultiPlatformStreams({
    liveStreams: once,
    chatrooms,
    preference: "kick",
  });

  assert.deepEqual(shown(once), [
    { channelName: "before", platform: "twitch" },
    { channelName: "xQc", platform: "kick" },
    { channelName: "after", platform: "twitch" },
  ]);
  assert.deepEqual(shown(twice), shown(once));
});

void test("chatroom lookup matches a key that differs only by case", () => {
  const liveStreams = [
    stream("LAGTVMaximusBlack"),
    stream("MaximusBlack", "kick"),
  ];
  const result = applyMultiPlatformStreams({
    liveStreams,
    chatrooms: { maximusblack: room("LAGTVMaximusBlack") },
    preference: "kick",
  });

  assert.deepEqual(shown(result), [
    { channelName: "MaximusBlack", platform: "kick" },
  ]);
});

void test("when two chatroom keys differ only by case, the later entry wins", () => {
  const liveStreams = [
    stream("FirstLogin"),
    stream("SecondLogin"),
    stream("xQc", "kick"),
  ];
  const result = applyMultiPlatformStreams({
    liveStreams,
    chatrooms: {
      xqc: room("FirstLogin"),
      XQC: room("SecondLogin"),
    },
    preference: "kick",
  });

  assert.deepEqual(shown(result), [
    { channelName: "FirstLogin", platform: "twitch" },
    { channelName: "xQc", platform: "kick" },
  ]);
});

void test("kickStreamerKey lowercases and keeps an empty twitch override", () => {
  assert.equal(kickStreamerKey("", "SomeKick"), "");
  assert.equal(kickStreamerKey(undefined, "xQc"), "xqc");
  assert.equal(
    kickStreamerKey("LAGTVMaximusBlack", "MaximusBlack"),
    "lagtvmaximusblack",
  );
});

void test("two Kick rows with the same person key both stay when Kick is preferred", () => {
  const liveStreams = [
    stream("xQc"),
    stream("xQc", "kick"),
    stream("XQC", "kick"),
  ];
  const result = applyMultiPlatformStreams({
    liveStreams,
    chatrooms: { xQc: room(), XQC: room() },
    preference: "kick",
  });

  assert.deepEqual(shown(result), [
    { channelName: "xQc", platform: "kick" },
    { channelName: "XQC", platform: "kick" },
  ]);
  assert.equal(result[0], liveStreams[1]);
  assert.equal(result[1], liveStreams[2]);
});

void test("the saved preference applies only after the list has painted", () => {
  assert.equal(preferenceOnFirstPaint(false, "kick"), "all");
  assert.equal(preferenceOnFirstPaint(true, "kick"), "kick");
});

void test("dropping a middle row keeps the survivors in their original order", () => {
  const liveStreams = [
    stream("alpha"),
    stream("xQc"),
    stream("omega", "kick"),
    stream("xQc", "kick"),
    stream("end"),
  ];
  const result = applyMultiPlatformStreams({
    liveStreams,
    chatrooms: { xQc: room() },
    preference: "kick",
  });

  assert.deepEqual(shown(result), [
    { channelName: "alpha", platform: "twitch" },
    { channelName: "omega", platform: "kick" },
    { channelName: "xQc", platform: "kick" },
    { channelName: "end", platform: "twitch" },
  ]);
});

void test("a Kick row missing from chatrooms pairs by its own channel name", () => {
  const liveStreams = [stream("Solo"), stream("other"), stream("Solo", "kick")];
  const result = applyMultiPlatformStreams({
    liveStreams,
    chatrooms: { someoneElse: room("not-solo") },
    preference: "kick",
  });

  assert.deepEqual(shown(result), [
    { channelName: "other", platform: "twitch" },
    { channelName: "Solo", platform: "kick" },
  ]);
});

void test("a favorites filter of the prefer Kick list omits the hidden Twitch twin and keeps the Kick favorite", () => {
  const listed = applyMultiPlatformStreams({
    liveStreams: [stream("xQc"), stream("xQc", "kick"), stream("other")],
    chatrooms: { xQc: room() },
    preference: "kick",
  });
  const filtered = filterFavoriteStreams(
    listed,
    [favoriteKey("twitch", "xQc"), favoriteKey("kick", "xQc")],
    [],
  );

  assert.deepEqual(shown(listed), [
    { channelName: "xQc", platform: "kick" },
    { channelName: "other", platform: "twitch" },
  ]);
  assert.deepEqual(shown(filtered), [{ channelName: "xQc", platform: "kick" }]);
});
