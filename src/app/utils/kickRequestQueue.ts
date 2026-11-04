import { type GlobalData } from "../../types";
import { backoffDelayMs } from "./kickLive";
import { sleep as defaultSleep } from "./sleep";

const REQUEST_SPACING_MS = 500;

const globalData = global as GlobalData;

export const touchKickPollHeartbeat = (at = Date.now()): void => {
  globalData.kickPollHeartbeat = at;
};

export interface KickRequestQueue {
  enqueue<T>(task: () => Promise<T>, options?: { front?: boolean }): Promise<T>;
  // Returns how long the queue will wait before its next request.
  noteResponse(status: number, retryAfter: string | null): number;
}

export interface KickRequestQueueDeps {
  spacingMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  onHeartbeat?: () => void;
}

interface Job {
  task: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

// One queue for every Kick API call in this process. Requests start 500ms
// after the previous one finishes. A 429 pauses the whole queue. A later
// caller can put a job at the front; it still waits out a pause already set.
export const createKickRequestQueue = (
  deps: KickRequestQueueDeps = {},
): KickRequestQueue => {
  const spacingMs = deps.spacingMs ?? REQUEST_SPACING_MS;
  const sleep = deps.sleep ?? defaultSleep;
  const now = deps.now ?? (() => Date.now());
  const onHeartbeat =
    deps.onHeartbeat ??
    (() => {
      globalData.kickPollHeartbeat = now();
    });

  const jobs: Job[] = [];
  let draining = false;
  let lastFinishedAt: number | null = null;
  let pauseUntil = 0;
  let consecutive429s = 0;

  const pump = (): void => {
    if (draining) return;
    draining = true;
    void drain();
  };

  const drain = async (): Promise<void> => {
    try {
      while (jobs.length > 0) {
        const current = now();
        const spacingWait =
          lastFinishedAt == null ? 0 : lastFinishedAt + spacingMs - current;
        const waitMs = Math.max(0, spacingWait, pauseUntil - current);
        if (waitMs > 0) await sleep(waitMs);
        const job = jobs.shift();
        if (!job) break;
        onHeartbeat();
        try {
          job.resolve(await job.task());
        } catch (error) {
          job.reject(error);
        } finally {
          lastFinishedAt = now();
        }
      }
    } finally {
      draining = false;
      if (jobs.length > 0) pump();
    }
  };

  return {
    enqueue<T>(task: () => Promise<T>, options?: { front?: boolean }) {
      return new Promise<T>((resolve, reject) => {
        const job: Job = {
          task,
          resolve: (value) => resolve(value as T),
          reject,
        };
        if (options?.front) jobs.unshift(job);
        else jobs.push(job);
        pump();
      });
    },
    noteResponse(status, retryAfter) {
      if (status === 429) {
        consecutive429s += 1;
        const delay = backoffDelayMs(retryAfter, consecutive429s, now());
        pauseUntil = Math.max(pauseUntil, now() + delay);
        onHeartbeat();
        return delay;
      }
      if (status === 200) consecutive429s = 0;
      return 0;
    },
  };
};

const QUEUE = Symbol.for("multi-watch.kickRequestQueue");

type GlobalWithQueue = typeof globalThis & {
  [QUEUE]?: KickRequestQueue;
};

export const getKickRequestQueue = (): KickRequestQueue => {
  const g = globalThis as GlobalWithQueue;
  g[QUEUE] ??= createKickRequestQueue();
  return g[QUEUE];
};
