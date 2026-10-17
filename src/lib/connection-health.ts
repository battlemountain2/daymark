import { db } from "./db";
export type ConnectionCheck = { checkedAt: string; succeededAt: string | null; error: string | null };
export async function connectionSchema() {
  await db().execute("CREATE TABLE IF NOT EXISTS connection_checks (id TEXT PRIMARY KEY, checked TEXT NOT NULL, succeeded TEXT, error TEXT)");
}
export async function recordConnectionCheck(id: string, error: string | null, checkedAt = new Date().toISOString()) {
  await connectionSchema();
  await db().execute({ sql: "INSERT INTO connection_checks(id,checked,succeeded,error) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET checked=excluded.checked,succeeded=CASE WHEN excluded.error IS NULL THEN excluded.succeeded ELSE connection_checks.succeeded END,error=excluded.error", args: [id, checkedAt, error ? null : checkedAt, error] });
}
export async function connectionChecks() {
  await connectionSchema();
  const result = await db().execute("SELECT id,checked,succeeded,error FROM connection_checks");
  return Object.fromEntries(result.rows.map(row => [String(row.id), { checkedAt: String(row.checked), succeededAt: row.succeeded ? String(row.succeeded) : null, error: row.error ? String(row.error) : null } satisfies ConnectionCheck]));
}
