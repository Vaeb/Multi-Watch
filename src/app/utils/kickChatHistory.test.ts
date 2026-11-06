import { strict as assert } from "node:assert";
import test from "node:test";
import {
  appendWithinMessageCap,
  KICK_CHAT_MESSAGE_CAP,
  messagesToDrop,
  type CappedMessageList,
} from "./kickChatHistory";

const ids = (length: number, start = 0): number[] =>
  Array.from({ length }, (_, index) => start + index);

interface RecordedList<T, Scroll> extends CappedMessageList<T, Scroll> {
  ops: string[];
  scrolls: { op: "append" | "batch"; scroll: Scroll | undefined }[];
}

/**
 * Same array updates as message-list 1.9.9: append copies
 * `[...existing, ...incoming]`, deleteRange is `slice(0, offset) + slice(offset + count)`.
 */
const createMessageList = <T, Scroll>(
  initial: readonly T[] = [],
): RecordedList<T, Scroll> => {
  let data = [...initial];
  const ops: string[] = [];
  const scrolls: { op: "append" | "batch"; scroll: Scroll | undefined }[] = [];
  return {
    ops,
    scrolls,
    get: () => data.slice(),
    append(items, scroll) {
      ops.push("append");
      scrolls.push({ op: "append", scroll });
      data = [...data, ...items];
    },
    deleteRange(offset, count) {
      ops.push(`deleteRange:${offset}:${count}`);
      data = data.slice(0, offset).concat(data.slice(offset + count));
    },
    batch(callback, scroll) {
      ops.push("batch");
      scrolls.push({ op: "batch", scroll });
      callback();
    },
  };
};

void test("the Kick chat cap is the latest 500 messages", () => {
  assert.equal(KICK_CHAT_MESSAGE_CAP, 500);
  assert.equal(messagesToDrop(499, 1), 0);
  assert.equal(messagesToDrop(500, 0), 0);
  assert.equal(messagesToDrop(500, 1), 1);
  assert.equal(messagesToDrop(500, 3), 3);
  assert.equal(messagesToDrop(490, 20), 10);
  assert.equal(messagesToDrop(0, 600), 100);
});

void test("fewer than 500 messages are left intact", () => {
  const current = [{ id: "a" }, { id: "b" }];
  const incoming = [{ id: "c" }];
  const list = createMessageList<(typeof current)[number], string>(current);

  appendWithinMessageCap(list, incoming, "scroll");

  const data = list.get();
  assert.equal(data.length, 3);
  assert.equal(data[0], current[0]);
  assert.equal(data[1], current[1]);
  assert.equal(data[2], incoming[0]);
  assert.deepEqual(current, [{ id: "a" }, { id: "b" }]);
  assert.deepEqual(incoming, [{ id: "c" }]);
  assert.deepEqual(list.ops, ["append"]);
  assert.deepEqual(list.scrolls, [{ op: "append", scroll: "scroll" }]);
});

void test("exactly 500 messages stay in place when nothing pushes past the cap", () => {
  const list = createMessageList<number, string>(
    ids(KICK_CHAT_MESSAGE_CAP - 1),
  );

  appendWithinMessageCap(list, [KICK_CHAT_MESSAGE_CAP - 1], "scroll");

  const data = list.get();
  assert.equal(data.length, KICK_CHAT_MESSAGE_CAP);
  assert.equal(data[0], 0);
  assert.equal(data[KICK_CHAT_MESSAGE_CAP - 1], KICK_CHAT_MESSAGE_CAP - 1);
  assert.deepEqual(list.ops, ["append"]);
});

void test("the next message past 500 drops the oldest and keeps the newest 500", () => {
  const list = createMessageList<number, string>(ids(KICK_CHAT_MESSAGE_CAP));

  appendWithinMessageCap(list, [KICK_CHAT_MESSAGE_CAP], "scroll");

  const data = list.get();
  assert.equal(data.length, KICK_CHAT_MESSAGE_CAP);
  assert.equal(data.includes(0), false);
  assert.equal(data[0], 1);
  assert.equal(data[KICK_CHAT_MESSAGE_CAP - 1], KICK_CHAT_MESSAGE_CAP);
  assert.deepEqual(list.ops, ["batch", "append", "deleteRange:0:1"]);
  assert.deepEqual(list.scrolls, [
    { op: "batch", scroll: "scroll" },
    { op: "append", scroll: undefined },
  ]);
});

void test("several messages past the cap leave only the newest 500", () => {
  const list = createMessageList<number, string>(ids(KICK_CHAT_MESSAGE_CAP));

  appendWithinMessageCap(list, [500, 501, 502]);

  assert.deepEqual(list.get(), ids(KICK_CHAT_MESSAGE_CAP, 3));
  assert.deepEqual(list.ops, ["batch", "append", "deleteRange:0:3"]);
});

void test("a history that is already far past the cap keeps the newest 500", () => {
  const list = createMessageList<number, string>(ids(800));

  appendWithinMessageCap(list, [800]);

  const data = list.get();
  assert.equal(data.length, KICK_CHAT_MESSAGE_CAP);
  assert.equal(data[0], 301);
  assert.equal(data[KICK_CHAT_MESSAGE_CAP - 1], 800);
  assert.equal(data.includes(300), false);
});

void test("appending more than the cap at once still keeps the newest 500", () => {
  const list = createMessageList<number, string>([]);

  appendWithinMessageCap(list, ids(600));

  assert.deepEqual(list.get(), ids(KICK_CHAT_MESSAGE_CAP, 100));
  assert.deepEqual(list.ops, ["batch", "append", "deleteRange:0:100"]);
});

void test("each list is capped on its own", () => {
  const full = createMessageList<number, string>(ids(KICK_CHAT_MESSAGE_CAP));
  const short = createMessageList<number, string>(ids(10, 1000));

  appendWithinMessageCap(full, [500]);
  appendWithinMessageCap(short, [1010]);

  assert.equal(full.get().length, KICK_CHAT_MESSAGE_CAP);
  assert.equal(full.get()[0], 1);
  assert.equal(full.get()[499], 500);
  assert.deepEqual(short.get(), ids(11, 1000));
  assert.deepEqual(short.ops, ["append"]);
});

void test("an empty append does not touch the list", () => {
  const list = createMessageList<number, string>(ids(4));

  appendWithinMessageCap(list, []);

  assert.deepEqual(list.get(), ids(4));
  assert.deepEqual(list.ops, []);
});
