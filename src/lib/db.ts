import { openDB, type IDBPDatabase } from "idb";
import type { Run, RunSummary, ActiveJob } from "./types";

const DB_NAME = "ai-ui-benchmark";
const DB_VERSION = 2;
const STORE_NAME = "runs";
const JOB_STORE = "active-job";
const JOB_KEY = "current";

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // v1: runs store
      if (oldVersion < 1) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("date", "date");
        store.createIndex("mode", "mode");
      }
      // v2: active-job store
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(JOB_STORE)) {
          db.createObjectStore(JOB_STORE);
        }
      }
    },
  });
}

// ── Run CRUD ────────────────────────────────────────────────────────

export async function saveRun(run: Run): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, run);
}

export async function loadRuns(): Promise<RunSummary[]> {
  const db = await getDB();
  const runs: Run[] = await db.getAllFromIndex(STORE_NAME, "date");
  // Return summaries (without full HTML designs), sorted newest first
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return runs.reverse().map(({ designs: _designs, ...summary }) => summary);
}

export async function loadRun(runId: string): Promise<Run | null> {
  const db = await getDB();
  return (await db.get(STORE_NAME, runId)) ?? null;
}

export async function deleteRun(runId: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, runId);
}

// ── ActiveJob CRUD ──────────────────────────────────────────────────

export async function saveActiveJob(job: ActiveJob): Promise<void> {
  const db = await getDB();
  await db.put(JOB_STORE, job, JOB_KEY);
}

export async function loadActiveJob(): Promise<ActiveJob | null> {
  const db = await getDB();
  return (await db.get(JOB_STORE, JOB_KEY)) ?? null;
}

export async function clearActiveJob(): Promise<void> {
  const db = await getDB();
  await db.delete(JOB_STORE, JOB_KEY);
}

export async function updateJobProgress(
  modelId: string,
  completedCount: number
): Promise<void> {
  const db = await getDB();
  const job: ActiveJob | undefined = await db.get(JOB_STORE, JOB_KEY);
  if (!job) return;
  job.completedVariants[modelId] = completedCount;
  await db.put(JOB_STORE, job, JOB_KEY);
}
