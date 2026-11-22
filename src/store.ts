// Local leaderboard: IndexedDB on this PC only, live-synced to other windows with BroadcastChannel.
// No network is ever used, so the booth keeps working without Wi-Fi.
import type { Ghost } from "./ghost";

export interface Run {
  id: string;
  initials: string;
  score: number;
  flick: number;
  track: number;
  clutch: number;
  ts: number;
  day: string; // YYYY-MM-DD local, so "today's top" resets naturally each event day
  ghost?: Ghost; // crosshair path + running score, raced by later players
}

const DB = "skyline-gauntlet";
const STORE = "runs";
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("skyline-board") : null;

export function today(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

let dbp: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  if (!dbp) {
    dbp = new Promise((ok, fail) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        const s = req.result.createObjectStore(STORE, { keyPath: "id" });
        s.createIndex("day", "day");
      };
      req.onsuccess = () => ok(req.result);
      req.onerror = () => fail(req.error);
    });
  }
  return dbp;
}

export async function saveRun(r: Run): Promise<void> {
  const d = await db();
  await new Promise<void>((ok, fail) => {
    const tx = d.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(r);
    tx.oncomplete = () => ok();
    tx.onerror = () => fail(tx.error);
  });
  channel?.postMessage({ type: "run", id: r.id });
}

export async function runsForDay(day = today()): Promise<Run[]> {
  const d = await db();
  return new Promise((ok, fail) => {
    const req = d.transaction(STORE).objectStore(STORE).index("day").getAll(day);
    req.onsuccess = () => ok((req.result as Run[]).sort((a, b) => b.score - a.score || a.ts - b.ts));
    req.onerror = () => fail(req.error);
  });
}

export async function allRuns(): Promise<Run[]> {
  const d = await db();
  return new Promise((ok, fail) => {
    const req = d.transaction(STORE).objectStore(STORE).getAll();
    req.onsuccess = () => ok(req.result as Run[]);
    req.onerror = () => fail(req.error);
  });
}

export async function clearDay(day = today()): Promise<void> {
  const runs = await runsForDay(day);
  const d = await db();
  await new Promise<void>((ok, fail) => {
    const tx = d.transaction(STORE, "readwrite");
    for (const r of runs) tx.objectStore(STORE).delete(r.id);
    tx.oncomplete = () => ok();
    tx.onerror = () => fail(tx.error);
  });
  channel?.postMessage({ type: "reset" });
}

export function onBoardChange(fn: (msg: { type: string; id?: string }) => void): void {
  channel?.addEventListener("message", (e) => fn(e.data));
}

/** Percentile (0-100) of `score` among today's runs: share of runs it beats or ties. */
export function percentile(score: number, runs: Run[]): number {
  if (runs.length === 0) return 100;
  const beaten = runs.filter((r) => r.score <= score).length;
  return Math.round((beaten / runs.length) * 100);
}

const BLOCKED = new Set(["ASS", "FUK", "FUC", "FCK", "SEX", "KKK", "NIG", "FAG", "CUM", "DIK", "TIT", "WTF", "XXX", "NAZ", "GAY", "SHT", "PNS", "VAG", "COK", "JEW"]);
export function cleanInitials(s: string): string {
  const up = s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3).padEnd(3, "-");
  return BLOCKED.has(up) ? "C9!" : up;
}

export function toCSV(runs: Run[]): string {
  const head = "initials,score,flick,track,clutch,day,time";
  const rows = runs.map((r) => [r.initials, r.score, r.flick, r.track, r.clutch, r.day, new Date(r.ts).toISOString()].join(","));
  return [head, ...rows].join("\n");
}
