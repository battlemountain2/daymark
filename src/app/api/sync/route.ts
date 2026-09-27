import { isSignedIn } from "@/lib/auth";
import { applyRecords, readRecords, ensureSync } from "@/lib/sync-db";
import { SYNC_KEYS, type SyncEdit } from "@/lib/sync-contract";
import { db } from "@/lib/db";
export async function GET() {
  if (!await isSignedIn()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSync();
  const history = await db().execute("SELECT namespace,key,value,saved_at,conflict FROM personal_history ORDER BY saved_at DESC LIMIT 1000");
  return Response.json({ history: history.rows }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(req: Request) {
  if (!await isSignedIn()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const raw = await req.text();
    if (raw.length > 2000000) return Response.json({ error: "Sync batch too large" }, { status: 413 });
    const { edits } = JSON.parse(raw);
    if (!Array.isArray(edits) || edits.length > 100 || !edits.every((e: SyncEdit) => e && (SYNC_KEYS as readonly string[]).includes(e.namespace) && typeof e.key === "string" && e.key.length <= 500 && (e.value === null || typeof e.value === "string" && e.value.length <= 250000) && Number.isSafeInteger(e.version) && e.version >= 0 && typeof e.operation === "string" && e.operation.length <= 100)) return Response.json({ error: "Invalid sync data" }, { status: 400 });
    const conflicts = await applyRecords(edits);
    return Response.json({ conflicts, records: await readRecords() }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Could not sync. Local edits remain queued." }, { status: 503 }); }
}
