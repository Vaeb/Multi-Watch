import { randomBytes } from "node:crypto";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NOPIXEL_DATA_INTERVAL } from "../constants";
import { type RemoteKickLivestream } from "../../types";

// Last Kick live list, kept with the timestamp the server stored it under.
//
// The file is <home>/.local/share/multi-watch/kick-live.json for the OS
// account that runs the server. Deploys and `next build` rewrite the
// application directory (including `.next`). This data directory sits outside
// that tree, so the new process still finds the previous snapshot, and the
// account can create the directory itself.
export const kickSnapshotPath = (): string => {
  const override = process.env.KICK_SNAPSHOT_PATH?.trim();
  if (override) return path.resolve(override);
  return path.join(
    os.homedir(),
    ".local",
    "share",
    "multi-watch",
    "kick-live.json",
  );
};

export interface KickSnapshot {
  streams: RemoteKickLivestream[];
  time: number;
}

// Same cutoff the server already used before this snapshot was persisted:
// the list is due for a client refresh 10s before the 5 minute data interval.
const KICK_SNAPSHOT_MAX_AGE_MS = NOPIXEL_DATA_INTERVAL - 1000 * 10;

export const isKickSnapshotCurrent = (
  cachedAt: number,
  now = Date.now(),
): boolean => now - cachedAt <= KICK_SNAPSHOT_MAX_AGE_MS;

const isKickSnapshot = (value: unknown): value is KickSnapshot => {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<KickSnapshot>;
  if (!Array.isArray(snapshot.streams)) return false;
  if (typeof snapshot.time !== "number" || !Number.isFinite(snapshot.time)) {
    return false;
  }
  return snapshot.streams.every((stream) => {
    if (!stream || typeof stream !== "object") return false;
    return (
      typeof (stream as Partial<RemoteKickLivestream>).channelName === "string"
    );
  });
};

// Missing, unreadable, and corrupt files all mean "no snapshot".
export const loadKickSnapshot = async (
  filePath = kickSnapshotPath(),
): Promise<KickSnapshot | null> => {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!isKickSnapshot(parsed)) return null;
    return { streams: parsed.streams, time: parsed.time };
  } catch {
    return null;
  }
};

const writes = new Map<string, Promise<void>>();

const enqueueWrite = (
  filePath: string,
  task: () => Promise<void>,
): Promise<void> => {
  const previous = writes.get(filePath) ?? Promise.resolve();
  const current = previous.then(task, task);
  writes.set(
    filePath,
    current.then(
      () => undefined,
      () => undefined,
    ),
  );
  return current;
};

// Write a temp file in the same directory, flush it, then rename it over the
// destination. rename replaces the old snapshot in one step, so a crash
// cannot leave a half-written kick-live.json.
const writeAtomically = async (filePath: string, contents: string) => {
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true });
  const tmpPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`,
  );
  const handle = await open(tmpPath, "w", 0o644);
  try {
    await handle.writeFile(contents, "utf8");
    await handle.sync();
  } catch (error) {
    await handle.close();
    await rm(tmpPath, { force: true });
    throw error;
  }
  await handle.close();
  try {
    await rename(tmpPath, filePath);
  } catch (error) {
    await rm(tmpPath, { force: true });
    throw error;
  }
};

export const saveKickSnapshot = (
  snapshot: KickSnapshot,
  filePath = kickSnapshotPath(),
): Promise<void> => {
  const contents = JSON.stringify({
    streams: snapshot.streams,
    time: snapshot.time,
  });
  return enqueueWrite(filePath, () => writeAtomically(filePath, contents));
};
