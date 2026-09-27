"use client";
import { SYNC_KEYS, splitRecords, joinRecords, type SyncRecord, type SyncEdit } from "./sync-contract";
const META = "daymark:sync:meta";
const QUEUE = "daymark:sync:queue";
type Meta = Record<string, number>;
let inFlight: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout>;
export type CloudStatus = { state: "checking" | "synced" | "pending" | "offline" | "conflict" | "error"; pending: number; message: string };
let status: CloudStatus = { state: "checking", pending: 0, message: "Checking cloud storage…" };
export const getCloudStatus = () => status;
function read<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } }
function report(state: CloudStatus["state"], message: string) {
  status = { state, message, pending: Object.keys(read(QUEUE, {})).length };
  window.dispatchEvent(new Event("daymark:sync-status"));
}
function changed() {
  window.dispatchEvent(new Event("daymark:cloud-updated"));
  window.dispatchEvent(new Event("custom-anki-updated"));
  window.dispatchEvent(new Event("custom-evidence-updated"));
}
export const cloudStorage = {
  getItem(key: string) { return localStorage.getItem(key); },
  setItem(namespace: string, raw: string) {
    if (!(SYNC_KEYS as readonly string[]).includes(namespace)) { localStorage.setItem(namespace, raw); return; }
    const before = splitRecords(namespace, localStorage.getItem(namespace));
    const after = splitRecords(namespace, raw);
    const queue = read<Record<string, SyncEdit>>(QUEUE, {});
    const meta = read<Meta>(META, {});
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (before[key] === after[key]) continue;
      const id = JSON.stringify([namespace, key]);
      queue[id] = { namespace, key, value: after[key] ?? null, version: queue[id]?.version ?? meta[id] ?? 0, operation: crypto.randomUUID() };
    }
    // Persist the outbox before the visible value. Storage errors surface to callers.
    localStorage.setItem(QUEUE, JSON.stringify(queue));
    localStorage.setItem(namespace, raw);
    report("pending", "Saved on this device · syncing…");
    clearTimeout(timer);
    timer = setTimeout(() => void syncCloud(), 800);
  },
};
export function syncCloud(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = run().finally(() => { inFlight = null; });
  return inFlight;
}
async function run() {
  try {
    if (!localStorage.getItem("hb:scratchpad:v2") && localStorage.getItem("hb:scratchpad:notes")) {
      localStorage.setItem("hb:scratchpad:v2", JSON.stringify({ General: localStorage.getItem("hb:scratchpad:notes") }));
    }
    const meta = read<Meta>(META, {});
    const queue = read<Record<string, SyncEdit>>(QUEUE, {});
    // Legacy data is insert-only: a second device never overwrites cloud records.
    for (const namespace of SYNC_KEYS) {
      for (const [key, value] of Object.entries(splitRecords(namespace, localStorage.getItem(namespace)))) {
        const id = JSON.stringify([namespace, key]);
        if (meta[id] === undefined && !queue[id]) queue[id] = { namespace, key, value, version: 0, operation: crypto.randomUUID(), migration: true };
      }
    }
    localStorage.setItem(QUEUE, JSON.stringify(queue));
    const batch = Object.values(queue).slice(0, 100);
    const res = await fetch("/api/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ edits: batch }), signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(res.status === 401 ? "Sign in to resume sync." : "Cloud sync is unavailable. Your edits are queued on this device.");
    const data = await res.json() as { records: SyncRecord[]; conflicts: string[] };
    const pending = read<Record<string, SyncEdit>>(QUEUE, {});
    for (const sent of batch) {
      const id = JSON.stringify([sent.namespace, sent.key]);
      if (pending[id]?.operation === sent.operation) delete pending[id];
      else if (pending[id]) pending[id].version = data.records.find(r => r.namespace === sent.namespace && r.key === sent.key)?.version ?? pending[id].version;
    }
    for (const namespace of SYNC_KEYS) {
      const values = splitRecords(namespace, localStorage.getItem(namespace));
      for (const r of data.records.filter(r => r.namespace === namespace)) {
        const id = JSON.stringify([namespace, r.key]);
        meta[id] = r.version;
        if (pending[id]) continue;
        if (r.value === null) delete values[r.key]; else values[r.key] = r.value;
      }
      localStorage.setItem(namespace, joinRecords(namespace, values));
    }
    localStorage.setItem(META, JSON.stringify(meta));
    localStorage.setItem(QUEUE, JSON.stringify(pending));
    changed();
    if (Object.keys(pending).length) {
      clearTimeout(timer); timer = setTimeout(() => void syncCloud(), 200);
    }
    if (data.conflicts.length) {
      localStorage.setItem("daymark:sync:conflicts", "true");
      report("conflict", "Another device changed the same item. Both versions are saved in recovery history.");
    } else if (Object.keys(pending).length) {
      report("pending", "Syncing remaining edits…");
      clearTimeout(timer); timer = setTimeout(() => void syncCloud(), 200);
    } else report(localStorage.getItem("daymark:sync:conflicts") ? "conflict" : "synced", localStorage.getItem("daymark:sync:conflicts") ? "Versions need review · recovery history is available below." : "Saved across your devices");
  } catch (e) { report(navigator.onLine ? "error" : "offline", e instanceof Error ? e.message : "Edits saved on this device; sync will retry."); }
}
