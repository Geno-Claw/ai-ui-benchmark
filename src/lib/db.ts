import { openDB, type IDBPDatabase } from "idb";
import type { Run, RunSummary } from "./types";

const DB_NAME = "ai-ui-benchmark";
const DB_VERSION = 1;
const STORE_NAME = "runs";

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("date", "date");
        store.createIndex("mode", "mode");
      }
    },
  });
}

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
