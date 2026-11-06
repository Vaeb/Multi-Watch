import { strict as assert } from "node:assert";
import test from "node:test";
import { parseSevenTvEmoteSet, sevenTvEmoteUrl } from "./kickEmotes";
import {
  EmoteCatalog,
  createKickUserIdLookup,
  fetchKickUserId,
  fetchSevenTvChannelSet,
} from "./kickEmoteCatalog";

const refreshMs = 30 * 60 * 1000;

const catalog = (options: {
  now: () => number;
  userId?: number | null;
  userIdFor?: (slug: string) => Promise<number | null>;
  fetchGlobal?: () => Promise<unknown>;
  fetchChannelSet?: (userId: number) => Promise<unknown>;
  refreshMs?: number;
}) => {
  const instance = new EmoteCatalog({
    now: options.now,
    refreshMs: options.refreshMs ?? refreshMs,
    userIdFor:
      options.userIdFor ?? (() => Promise.resolve(options.userId ?? null)),
    fetchGlobal: options.fetchGlobal ?? (() => Promise.resolve({ emotes: [] })),
    fetchChannelSet:
      options.fetchChannelSet ?? (() => Promise.resolve({ emotes: [] })),
  });
  return instance;
};

const requestUrl = (input: RequestInfo | URL): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
};

const silenceConsole = () => {
  const original = console.error;
  const lines: string[] = [];
  console.error = (...args: unknown[]) => {
    lines.push(args.map((arg) => String(arg)).join(" "));
  };
  return {
    lines,
    restore: () => {
      console.error = original;
    },
  };
};

void test("channel emotes override global emotes with the same name", async () => {
  let now = 1_000;
  let channelCalls = 0;
  const instance = catalog({
    now: () => now,
    userId: 676,
    fetchGlobal: () =>
      Promise.resolve({
        emotes: [
          { id: "glob", name: "KEKW" },
          { id: "rain", name: "RainTime" },
        ],
      }),
    fetchChannelSet: (userId) => {
      channelCalls += 1;
      assert.equal(userId, 676);
      return Promise.resolve({
        data: {
          emoteSet: {
            emotes: [
              { id: "chan", name: "KEKW" },
              { id: "gamba", name: "GAMBA" },
            ],
          },
        },
      });
    },
  });
  await instance.watch("xQc");
  await instance.watch("xqc");
  assert.equal(channelCalls, 1);
  const emotes = instance.emotesFor("XQC");
  assert.equal(emotes?.get("KEKW"), sevenTvEmoteUrl("chan"));
  assert.equal(emotes?.get("RainTime"), sevenTvEmoteUrl("rain"));
  assert.equal(emotes?.get("GAMBA"), sevenTvEmoteUrl("gamba"));

  now += refreshMs;
  await instance.watch("xqc");
  assert.equal(channelCalls, 2);
});

void test("one global fetch is shared and an unknown user id skips the channel set", async () => {
  let globalCalls = 0;
  let channelCalls = 0;
  let release: (value: unknown) => void = () => undefined;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const instance = catalog({
    now: () => 5_000,
    userIdFor: () => Promise.resolve(null),
    fetchGlobal: () => {
      globalCalls += 1;
      return gate;
    },
    fetchChannelSet: () => {
      channelCalls += 1;
      return Promise.resolve({ emotes: [] });
    },
  });
  const first = instance.watch("xqc");
  const second = instance.watch("trainwreckstv");
  assert.equal(globalCalls, 1);
  release({ emotes: [{ id: "rain", name: "RainTime" }] });
  await Promise.all([first, second]);
  assert.equal(channelCalls, 0);
  assert.equal(
    instance.emotesFor("xqc")?.get("RainTime"),
    sevenTvEmoteUrl("rain"),
  );
  assert.equal(
    instance.emotesFor("trainwreckstv")?.get("RainTime"),
    sevenTvEmoteUrl("rain"),
  );
});

void test("the channel set is fetched once a Kick user id is known", async () => {
  let userId: number | null = null;
  let channelCalls = 0;
  const instance = catalog({
    now: () => 5_000,
    userIdFor: () => Promise.resolve(userId),
    fetchChannelSet: () => {
      channelCalls += 1;
      return Promise.resolve({ emotes: [{ id: "gamba", name: "GAMBA" }] });
    },
  });
  await instance.watch("xqc");
  assert.equal(channelCalls, 0);
  userId = 676;
  await instance.watch("xqc");
  assert.equal(channelCalls, 1);
  assert.equal(
    instance.emotesFor("xqc")?.get("GAMBA"),
    sevenTvEmoteUrl("gamba"),
  );
});

void test("a failed refresh keeps the last good set", async () => {
  const logs = silenceConsole();
  try {
    let now = 5_000;
    let failChannel = false;
    let failGlobal = false;
    const instance = catalog({
      now: () => now,
      userId: 676,
      fetchGlobal: () => {
        if (failGlobal) return Promise.reject(new Error("global down"));
        return Promise.resolve({ emotes: [{ id: "rain", name: "RainTime" }] });
      },
      fetchChannelSet: () => {
        if (failChannel) return Promise.reject(new Error("channel down"));
        return Promise.resolve({ emotes: [{ id: "gamba", name: "GAMBA" }] });
      },
    });
    await instance.watch("xqc");
    assert.equal(
      instance.emotesFor("xqc")?.get("GAMBA"),
      sevenTvEmoteUrl("gamba"),
    );
    failChannel = true;
    failGlobal = true;
    now += refreshMs;
    await instance.watch("xqc");
    assert.equal(
      instance.emotesFor("xqc")?.get("GAMBA"),
      sevenTvEmoteUrl("gamba"),
    );
    assert.equal(
      instance.emotesFor("xqc")?.get("RainTime"),
      sevenTvEmoteUrl("rain"),
    );
    assert.ok(logs.lines.length > 0);
  } finally {
    logs.restore();
  }
});

void test("a failed global fetch is retried on the next open and keeps channel emotes", async () => {
  const logs = silenceConsole();
  try {
    let globalCalls = 0;
    let channelCalls = 0;
    let failGlobal = true;
    const instance = catalog({
      now: () => 5_000,
      userId: 676,
      fetchGlobal: () => {
        globalCalls += 1;
        if (failGlobal) return Promise.reject(new Error("global down"));
        return Promise.resolve({ emotes: [{ id: "rain", name: "RainTime" }] });
      },
      fetchChannelSet: () => {
        channelCalls += 1;
        return Promise.resolve({ emotes: [{ id: "gamba", name: "GAMBA" }] });
      },
    });
    await instance.watch("xqc");
    assert.equal(
      instance.emotesFor("xqc")?.get("GAMBA"),
      sevenTvEmoteUrl("gamba"),
    );
    assert.equal(instance.emotesFor("xqc")?.has("RainTime"), false);
    failGlobal = false;
    await instance.watch("xqc");
    assert.equal(globalCalls, 2);
    assert.equal(channelCalls, 1);
    assert.equal(
      instance.emotesFor("xqc")?.get("RainTime"),
      sevenTvEmoteUrl("rain"),
    );
    assert.equal(
      instance.emotesFor("xqc")?.get("GAMBA"),
      sevenTvEmoteUrl("gamba"),
    );
    assert.ok(logs.lines.some((line) => line.includes("global")));
  } finally {
    logs.restore();
  }
});

void test("a failed channel fetch is retried instead of being cached as empty", async () => {
  const logs = silenceConsole();
  try {
    let channelCalls = 0;
    let failChannel = true;
    const instance = catalog({
      now: () => 5_000,
      userId: 676,
      fetchChannelSet: () => {
        channelCalls += 1;
        if (failChannel) return Promise.reject(new Error("channel down"));
        return Promise.resolve({ emotes: [{ id: "gamba", name: "GAMBA" }] });
      },
    });
    await instance.watch("xqc");
    assert.equal(instance.emotesFor("xqc")?.has("GAMBA"), false);
    failChannel = false;
    await instance.watch("xqc");
    assert.equal(channelCalls, 2);
    assert.equal(
      instance.emotesFor("xqc")?.get("GAMBA"),
      sevenTvEmoteUrl("gamba"),
    );
  } finally {
    logs.restore();
  }
});

void test("closing a channel before the fetch finishes does not publish", async () => {
  let release: (value: unknown) => void = () => undefined;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const instance = catalog({
    now: () => 5_000,
    userId: 676,
    fetchGlobal: () => gate,
  });
  const pending = instance.watch("xqc");
  instance.unwatch("xqc");
  release({ emotes: [{ id: "rain", name: "RainTime" }] });
  await pending;
  assert.equal(instance.emotesFor("xqc"), undefined);
});

void test("reopening within the refresh window reuses the set", async () => {
  let channelCalls = 0;
  const instance = catalog({
    now: () => 5_000,
    userId: 676,
    fetchChannelSet: () => {
      channelCalls += 1;
      return Promise.resolve({ emotes: [{ id: "gamba", name: "GAMBA" }] });
    },
  });
  await instance.watch("xqc");
  instance.unwatch("xqc");
  await instance.watch("xqc");
  assert.equal(channelCalls, 1);
  assert.equal(
    instance.emotesFor("xqc")?.get("GAMBA"),
    sevenTvEmoteUrl("gamba"),
  );
});

void test("the refresh interval reloads a channel that is still open", async () => {
  let globalCalls = 0;
  const instance = catalog({
    now: () => Date.now(),
    refreshMs: 40,
    userId: null,
    fetchGlobal: () => {
      globalCalls += 1;
      return Promise.resolve({ emotes: [] });
    },
  });
  instance.start();
  try {
    await instance.watch("xqc");
    assert.equal(globalCalls, 1);
    const deadline = Date.now() + 1_000;
    while (globalCalls < 2 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
    assert.ok(globalCalls >= 2);
    const settled = globalCalls;
    instance.stop();
    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.equal(globalCalls, settled);
  } finally {
    instance.stop();
  }
});

void test("channel emotes are requested with the Kick user id", async () => {
  const calls: { url: string; body: string }[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: requestUrl(input),
      body: typeof init?.body === "string" ? init.body : "",
    });
    if (calls.length === 1) {
      return Response.json({
        data: {
          userByConnection: {
            connections: [
              {
                platform: "KICK",
                id: "676",
                emote_set_id: "01FE9DRF000009TR6M9N941CYW",
              },
            ],
          },
        },
      });
    }
    return Response.json({
      data: { emoteSet: { emotes: [{ id: "abc", name: "GAMBA" }] } },
    });
  }) as unknown as typeof fetch;
  try {
    const body = await fetchSevenTvChannelSet(676);
    assert.equal(
      parseSevenTvEmoteSet(body)?.get("GAMBA"),
      sevenTvEmoteUrl("abc"),
    );
    assert.equal(calls.length, 2);
    assert.match(calls[0]?.body ?? "", /"id":"676"/);
    assert.equal(
      new URL(calls[0]?.url ?? "https://example.invalid").pathname,
      "/v3/gql",
    );
    assert.match(calls[1]?.body ?? "", /01FE9DRF000009TR6M9N941CYW/);
  } finally {
    globalThis.fetch = original;
  }
});

void test("Kick user id lookup reads user_id and remembers it", async () => {
  let calls = 0;
  let fail = false;
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls += 1;
    if (fail) throw new Error(`down ${requestUrl(input)}`);
    return Response.json({ id: 668, user_id: 676, chatroom: { id: 668 } });
  }) as unknown as typeof fetch;
  try {
    assert.equal(await fetchKickUserId("xQc"), 676);
    const lookup = createKickUserIdLookup();
    fail = true;
    await assert.rejects(() => lookup("xQc"));
    fail = false;
    assert.equal(await lookup("xQc"), 676);
    assert.equal(await lookup("xqc"), 676);
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = original;
  }
});

void test("a Kick channel document without a user id does not invent one", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    Response.json({
      id: 875396,
      chatroom: { id: 875062 },
    })) as unknown as typeof fetch;
  try {
    assert.equal(await fetchKickUserId("adinross"), null);
  } finally {
    globalThis.fetch = original;
  }
});
