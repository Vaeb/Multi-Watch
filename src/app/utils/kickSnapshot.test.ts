import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  chmod,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { NOPIXEL_DATA_INTERVAL } from "../constants";
import { type RemoteKickLivestream } from "../../types";
import { KICK_STATUS_DELAYED, kickStatusText } from "./kickLive";
import {
  isKickSnapshotCurrent,
  kickSnapshotPath,
  loadKickSnapshot,
  saveKickSnapshot,
} from "./kickSnapshot";

const MAX_AGE_MS = NOPIXEL_DATA_INTERVAL - 1000 * 10;
const streamsModule = pathToFileURL(
  path.join(process.cwd(), "src/app/utils/getStreams.ts"),
).href;

const stream = (channelName: string, viewers = 10): RemoteKickLivestream => ({
  id: viewers,
  channelName,
  session_title: `NoPixel | ${channelName}`,
  created_at: "2024-01-01T00:00:00.000Z",
  viewers,
  playback_url: `https://example.test/${channelName}.m3u8`,
  category: { id: 1, name: "Just Chatting", slug: "just-chatting" },
  thumbnail: {
    src: `https://example.test/${channelName}.jpg`,
    srcset: "",
  },
});

const withDir = async (run: (dir: string) => Promise<void>) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "kick-snapshot-"));
  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

const runNode = async (script: string, env: Record<string, string>) => {
  const child = spawn(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      "tsx",
      "--input-type=module",
      "-e",
      script,
    ],
    {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
    },
  );
  assert.ok(child.stdout);
  assert.ok(child.stderr);
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk;
  });
  const killer = setTimeout(() => child.kill("SIGKILL"), 20_000);
  const [code] = (await once(child, "exit")) as [number | null];
  clearTimeout(killer);
  return { code, stdout, stderr };
};

const bootScript = `
const { init, getStreams } = await import(${JSON.stringify(streamsModule)});
await init();
global.cachedTwitch = { streams: [], filterFactions: [], useColorsDark: {} };
global.cachedTwitchTime = 1;
const received = await getStreams();
const { writeFileSync } = await import("node:fs");
writeFileSync(process.env.RESULT_PATH, JSON.stringify({
  time: global.cachedKickTime,
  kickSavedAt: received.kickSavedAt,
  needsKickLiveStreams: received.needsKickLiveStreams,
  channels: received.parsed.streams.map((entry) => entry.channelName),
}));
process.exit(0);
`;

interface BootReport {
  time: number;
  kickSavedAt: number;
  needsKickLiveStreams: boolean;
  channels: string[];
}

const boot = async (filePath: string): Promise<BootReport> => {
  const resultPath = `${filePath}.boot.json`;
  const result = await runNode(bootScript, {
    KICK_SNAPSHOT_PATH: filePath,
    RESULT_PATH: resultPath,
  });
  assert.equal(
    result.code,
    0,
    `boot process failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  return JSON.parse(await readFile(resultPath, "utf8")) as BootReport;
};

void test("the snapshot file is outside the application directory", () => {
  const filePath = kickSnapshotPath();
  const appDir = path.resolve(process.cwd());
  assert.equal(process.env.KICK_SNAPSHOT_PATH, undefined);
  assert.equal(filePath.startsWith(`${appDir}${path.sep}`), false);
  assert.equal(
    filePath,
    path.join(os.homedir(), ".local", "share", "multi-watch", "kick-live.json"),
  );
});

void test("a snapshot inside the existing cache window counts as current", () => {
  const now = 1_700_000_000_000;
  assert.equal(isKickSnapshotCurrent(now, now), true);
  assert.equal(isKickSnapshotCurrent(now - MAX_AGE_MS, now), true);
});

void test("a snapshot older than the existing cache window is stale", () => {
  const now = 1_700_000_000_000;
  assert.equal(isKickSnapshotCurrent(now - MAX_AGE_MS - 1, now), false);
  assert.equal(isKickSnapshotCurrent(0, now), false);
});

void test("save and load keep the streams and the original timestamp", async () => {
  await withDir(async (dir) => {
    const filePath = path.join(dir, "kick-live.json");
    const savedAt = 1_700_000_000_123;
    const streams = [stream("Alpha", 40), stream("Beta", 12)];
    await saveKickSnapshot({ streams, time: savedAt }, filePath);

    const loaded = await loadKickSnapshot(filePath);
    assert.ok(loaded);
    assert.equal(loaded.time, savedAt);
    assert.deepEqual(loaded.streams, streams);

    const info = await stat(filePath);
    assert.ok(Math.abs(info.mtimeMs - savedAt) > 1000);
  });
});

void test("a missing file loads as no snapshot", async () => {
  await withDir(async (dir) => {
    const loaded = await loadKickSnapshot(path.join(dir, "missing.json"));
    assert.equal(loaded, null);
  });
});

void test("a corrupt file loads as no snapshot", async () => {
  await withDir(async (dir) => {
    const filePath = path.join(dir, "kick-live.json");
    for (const contents of [
      "{",
      "[]",
      "null",
      '{"streams":[{"channelName":"A"}],"time":"yesterday"}',
      '{"streams":[null],"time":1}',
      '{"time":1}',
      '{"streams":[{"viewers":1}],"time":1}',
    ]) {
      await writeFile(filePath, contents);
      assert.equal(await loadKickSnapshot(filePath), null, contents);
    }
  });
});

void test("an unreadable file loads as no snapshot", async () => {
  await withDir(async (dir) => {
    const filePath = path.join(dir, "kick-live.json");
    await writeFile(
      filePath,
      JSON.stringify({ streams: [stream("Hidden")], time: 10 }),
    );
    await chmod(filePath, 0o000);
    try {
      assert.equal(await loadKickSnapshot(filePath), null);
    } finally {
      await chmod(filePath, 0o600);
    }
  });
});

void test("a failed save leaves the previous snapshot intact and no temp file", async () => {
  await withDir(async (dir) => {
    const filePath = path.join(dir, "kick-live.json");
    await saveKickSnapshot({ streams: [stream("Kept")], time: 80 }, filePath);
    await chmod(dir, 0o500);
    try {
      await assert.rejects(() =>
        saveKickSnapshot({ streams: [stream("Lost")], time: 90 }, filePath),
      );
    } finally {
      await chmod(dir, 0o700);
    }
    const loaded = await loadKickSnapshot(filePath);
    assert.ok(loaded);
    assert.equal(loaded.time, 80);
    assert.equal(loaded.streams[0]?.channelName, "Kept");
    const names = await readdir(dir);
    assert.deepEqual(
      names.filter((name) => name.endsWith(".tmp")),
      [],
    );
  });
});

void test("replacing the snapshot never leaves a partial file", async () => {
  await withDir(async (dir) => {
    const filePath = path.join(dir, "kick-live.json");
    const padded = (channelName: string, time: number) => ({
      streams: [
        {
          ...stream(channelName),
          session_title: "NoPixel | ".padEnd(32_000, "x"),
        },
      ],
      time,
    });
    await saveKickSnapshot(padded("First", 1), filePath);

    let stop = false;
    const errors: string[] = [];
    const reader = (async () => {
      while (!stop) {
        const raw = await readFile(filePath, "utf8");
        try {
          const parsed = JSON.parse(raw) as {
            streams?: { channelName?: string }[];
            time?: number;
          };
          if (
            !Array.isArray(parsed.streams) ||
            parsed.streams.length !== 1 ||
            typeof parsed.time !== "number"
          ) {
            errors.push(raw.slice(0, 120));
          }
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error));
        }
      }
    })();

    try {
      for (let time = 2; time <= 20; time++) {
        await saveKickSnapshot(padded(`Channel${time}`, time), filePath);
      }
    } finally {
      stop = true;
    }
    await reader;

    assert.deepEqual(errors, []);
    const loaded = await loadKickSnapshot(filePath);
    assert.equal(loaded?.time, 20);
    assert.equal(loaded?.streams[0]?.channelName, "Channel20");
    const names = await readdir(dir);
    assert.deepEqual(
      names.filter((name) => name.endsWith(".tmp")),
      [],
    );
  });
});

void test("a fresh process serves a recent snapshot as current", async () => {
  await withDir(async (dir) => {
    const filePath = path.join(dir, "kick-live.json");
    const savedAt = Date.now();
    await saveKickSnapshot(
      { streams: [stream("RecentKick")], time: savedAt },
      filePath,
    );

    const report = await boot(filePath);
    assert.equal(report.time, savedAt);
    assert.equal(report.kickSavedAt, savedAt);
    assert.equal(report.needsKickLiveStreams, false);
    assert.equal(kickStatusText(report.kickSavedAt, savedAt), "");
    assert.equal(report.channels.includes("RecentKick"), true);
  });
});

void test("a fresh process serves an older snapshot and marks it stale", async () => {
  await withDir(async (dir) => {
    const filePath = path.join(dir, "kick-live.json");
    const savedAt = Date.now() - 10 * 60 * 1000;
    await saveKickSnapshot(
      { streams: [stream("OlderKick", 80)], time: savedAt },
      filePath,
    );

    const report = await boot(filePath);
    assert.equal(report.time, savedAt);
    assert.equal(report.kickSavedAt, savedAt);
    assert.equal(report.needsKickLiveStreams, true);
    assert.equal(kickStatusText(report.kickSavedAt), KICK_STATUS_DELAYED);
    assert.equal(report.channels.includes("OlderKick"), true);
  });
});

void test("a fresh process stays empty when the snapshot cannot be read", async () => {
  await withDir(async (dir) => {
    const missing = await boot(path.join(dir, "missing.json"));
    assert.equal(missing.time, 0);
    assert.equal(missing.kickSavedAt, 0);
    assert.equal(missing.needsKickLiveStreams, true);
    assert.equal(
      kickStatusText(missing.kickSavedAt, 60_000),
      KICK_STATUS_DELAYED,
    );
    assert.deepEqual(missing.channels, []);

    const corruptPath = path.join(dir, "corrupt.json");
    await writeFile(corruptPath, "{not json");
    const corrupt = await boot(corruptPath);
    assert.equal(corrupt.time, 0);
    assert.equal(corrupt.kickSavedAt, 0);
    assert.equal(corrupt.needsKickLiveStreams, true);
    assert.deepEqual(corrupt.channels, []);
  });
});

void test("a snapshot stamped at 0 still returns its rows", async () => {
  await withDir(async (dir) => {
    const filePath = path.join(dir, "kick-live.json");
    await saveKickSnapshot(
      { streams: [stream("DelayedSentinel", 50)], time: 0 },
      filePath,
    );

    const report = await boot(filePath);
    assert.equal(report.time, 0);
    assert.equal(report.kickSavedAt, 0);
    assert.equal(
      kickStatusText(report.kickSavedAt, 60_000),
      KICK_STATUS_DELAYED,
    );
    assert.equal(report.channels.includes("DelayedSentinel"), true);
  });
});

void test("updating the live list saves that timestamp for the next process", async () => {
  await withDir(async (dir) => {
    const filePath = path.join(dir, "kick-live.json");
    const resultPath = path.join(dir, "saved.json");
    const live = stream("SavedKick", 64);
    const started = Date.now();
    const saveScript = `
      const { setKickStreams } = await import(${JSON.stringify(streamsModule)});
      const { writeFileSync } = await import("node:fs");
      await setKickStreams([${JSON.stringify(live)}], false);
      writeFileSync(${JSON.stringify(resultPath)}, JSON.stringify({
        time: global.cachedKickTime,
        channel: global.cachedKickStreams[0].channelName,
      }));
      process.exit(0);
    `;
    const saved = await runNode(saveScript, { KICK_SNAPSHOT_PATH: filePath });
    assert.equal(
      saved.code,
      0,
      `save process failed\nstdout:\n${saved.stdout}\nstderr:\n${saved.stderr}`,
    );
    const memory = JSON.parse(await readFile(resultPath, "utf8")) as {
      time: number;
      channel: string;
    };
    const loaded = await loadKickSnapshot(filePath);
    assert.ok(loaded);
    assert.equal(loaded.time, memory.time);
    assert.equal(loaded.streams[0]?.channelName, "SavedKick");
    assert.ok(loaded.time >= started);
    assert.equal(loaded.streams[0]?.playback_url, live.playback_url);

    const report = await boot(filePath);
    assert.equal(report.time, memory.time);
    assert.equal(report.needsKickLiveStreams, false);
    assert.equal(report.channels.includes("SavedKick"), true);
  });
});
