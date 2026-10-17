export const SYNC_KEYS = ["hb:scratchpad:v2", "hb:custom-anki-cards", "hb:custom-synthesis-evidence", "hb:syllabus-weights:v1", "daymark:srs:v1", "daymark:workout:sets", "daymark:workout:history", "daymark:workout:sessions:v1", "daymark:focus-stats", "daymark:focus-history", "daymark:coding-progress", "daymark:news", "daymark:releases", "daymark:backlog", "daymark:layout", "daymark:highlights", "daymark:reader", "daymark:reading-links", "daymark:note-links", "daymark:notebook", "daymark:projects", "daymark:shelves", "daymark:media-history", "daymark:radar-follows", "daymark:radar-state", "daymark:gmail-dismissed", "daymark:youtube"] as const;
export type SyncRecord = { namespace: string; key: string; value: string | null; version: number };
export type SyncEdit = SyncRecord & { operation: string; migration?: boolean };
/** Stay below the API body limit even when a notebook restore queues long notes. */
export function syncBatch(edits: SyncEdit[]) {
  const batch: SyncEdit[] = [];
  let size = 20;
  for (const edit of edits) {
    const next = JSON.stringify(edit).length + 1;
    if (batch.length === 100 || size + next > 1500000) break;
    batch.push(edit); size += next;
  }
  return batch;
}
const arrays = new Set(["hb:custom-anki-cards", "hb:custom-synthesis-evidence", "hb:syllabus-weights:v1"]);
export function splitRecords(namespace: string, raw: string | null): Record<string, string> {
  if (!raw) return {};
  const value = JSON.parse(raw);
  if (arrays.has(namespace)) return Object.fromEntries(value.map((v: { id?: string; code?: string }) => [v.id || v.code, JSON.stringify(v)]));
  if (namespace === "daymark:focus-stats") return { current: raw };
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, JSON.stringify(v)]));
}
export function joinRecords(namespace: string, records: Record<string, string>): string {
  if (namespace === "daymark:focus-stats") return records.current || "null";
  const values = Object.fromEntries(Object.entries(records).map(([k, v]) => [k, JSON.parse(v)]));
  return JSON.stringify(arrays.has(namespace) ? Object.values(values) : values);
}
