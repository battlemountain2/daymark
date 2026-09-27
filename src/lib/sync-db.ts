import { db } from "./db";
import type { SyncEdit, SyncRecord } from "./sync-contract";
let schema: Promise<unknown> | undefined;
export async function ensureSync() {
  await (schema ||= db().batch([
    `CREATE TABLE IF NOT EXISTS personal_records (namespace TEXT NOT NULL, key TEXT NOT NULL, value TEXT, version INTEGER NOT NULL, operation TEXT NOT NULL, PRIMARY KEY(namespace,key))`,
    `CREATE TABLE IF NOT EXISTS personal_history (operation TEXT PRIMARY KEY, namespace TEXT NOT NULL, key TEXT NOT NULL, value TEXT, saved_at TEXT NOT NULL, conflict INTEGER NOT NULL DEFAULT 0)`,
  ], "write").catch(e => { schema = undefined; throw e; }));
}
export async function readRecords(): Promise<SyncRecord[]> {
  await ensureSync();
  const result = await db().execute("SELECT namespace,key,value,version FROM personal_records");
  return result.rows.map(r => ({ namespace: String(r.namespace), key: String(r.key), value: r.value === null ? null : String(r.value), version: Number(r.version) }));
}
export async function applyRecords(edits: SyncEdit[]) {
  await ensureSync();
  const tx = await db().transaction("write");
  const conflicts: string[] = [];
  try {
    for (const edit of edits) {
      const seen = await tx.execute({ sql: "SELECT operation FROM personal_history WHERE operation=?", args: [edit.operation] });
      if (seen.rows.length) continue;
      const existing = await tx.execute({ sql: "SELECT version,value FROM personal_records WHERE namespace=? AND key=?", args: [edit.namespace, edit.key] });
      const row = existing.rows[0];
      const conflict = !!row && Number(row.version) !== edit.version && row.value !== edit.value;
      await tx.execute({ sql: "INSERT INTO personal_history(operation,namespace,key,value,saved_at,conflict) VALUES(?,?,?,?,?,?)", args: [edit.operation, edit.namespace, edit.key, edit.value, new Date().toISOString(), conflict ? 1 : 0] });
      if (conflict) { conflicts.push(edit.operation); continue; }
      await tx.execute({ sql: `INSERT INTO personal_records(namespace,key,value,version,operation) VALUES(?,?,?,?,?) ON CONFLICT(namespace,key) DO UPDATE SET value=excluded.value,version=excluded.version,operation=excluded.operation`, args: [edit.namespace, edit.key, edit.value, Number(row?.version || 0) + 1, edit.operation] });
    }
    await tx.commit();
    return conflicts;
  } catch (e) { await tx.rollback(); throw e; } finally { tx.close(); }
}
