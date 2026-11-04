import { strict as assert } from "node:assert";
import test from "node:test";
import { createKickRequestQueue } from "./kickRequestQueue";

const ignoreHeartbeat = (): undefined => undefined;

void test("the queue spaces requests and a 429 pause overrides that gap", async () => {
  const delays: number[] = [];
  let clock = 1_000;
  const queue = createKickRequestQueue({
    spacingMs: 500,
    now: () => clock,
    sleep: async (ms) => {
      delays.push(ms);
      clock += ms;
    },
    onHeartbeat: ignoreHeartbeat,
  });

  await queue.enqueue(async () => {
    queue.noteResponse(200, null);
  });
  await queue.enqueue(async () => {
    queue.noteResponse(429, "3");
  });
  await queue.enqueue(async () => {
    queue.noteResponse(429, null);
  });
  await queue.enqueue(async () => undefined);

  assert.deepEqual(delays, [500, 3_000, 10_000]);
});

void test("a 200 resets the 429 ladder", async () => {
  const delays: number[] = [];
  let clock = 10_000;
  const queue = createKickRequestQueue({
    spacingMs: 0,
    now: () => clock,
    sleep: async (ms) => {
      delays.push(ms);
      clock += ms;
    },
    onHeartbeat: ignoreHeartbeat,
  });

  await queue.enqueue(async () => {
    queue.noteResponse(429, null);
  });
  await queue.enqueue(async () => {
    queue.noteResponse(200, null);
  });
  await queue.enqueue(async () => {
    queue.noteResponse(429, null);
  });
  await queue.enqueue(async () => undefined);

  assert.deepEqual(delays, [5_000, 5_000]);
});

void test("a front job runs next, after the one already in flight", async () => {
  const queue = createKickRequestQueue({
    spacingMs: 0,
    now: () => 0,
    sleep: async () => undefined,
    onHeartbeat: ignoreHeartbeat,
  });
  const order: string[] = [];
  let releaseFirst: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });

  const first = queue.enqueue(async () => {
    order.push("first");
    await gate;
  });
  const queued = queue.enqueue(async () => {
    order.push("queued");
  });
  const front = queue.enqueue(
    async () => {
      order.push("front");
    },
    { front: true },
  );

  releaseFirst();
  await Promise.all([first, queued, front]);
  assert.deepEqual(order, ["first", "front", "queued"]);
});

void test("a failed request does not stall the next one", async () => {
  const queue = createKickRequestQueue({
    spacingMs: 0,
    now: () => 0,
    sleep: async () => undefined,
    onHeartbeat: ignoreHeartbeat,
  });

  await assert.rejects(
    queue.enqueue(async () => {
      throw new Error("boom");
    }),
    /boom/,
  );
  assert.equal(await queue.enqueue(async () => "ok"), "ok");
});
