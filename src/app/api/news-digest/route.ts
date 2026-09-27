import { isSignedIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureAI, claimAIRequest, generateAI } from "@/lib/ai";
import { getStories } from "@/lib/feeds";
import { readRecords } from "@/lib/sync-db";
export const maxDuration = 60;
export async function POST() {
  if (!await isSignedIn()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await ensureAI();
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver" }).format(new Date());
    const key = `news:${day}`;
    const existing = await db().execute({ sql: "SELECT value,expires FROM agent_cache WHERE key=?", args: [key] });
    if (existing.rows[0]?.value) return Response.json(JSON.parse(String(existing.rows[0].value)));
    const claimed = await db().execute({ sql: "INSERT INTO agent_cache(key,value,expires) VALUES(?,NULL,?) ON CONFLICT(key) DO UPDATE SET expires=excluded.expires WHERE value IS NULL AND expires<? RETURNING key", args: [key, Date.now() + 60000, Date.now()] });
    if (!claimed.rows.length) return Response.json({ error: "Today's digest is being prepared. Try again shortly." }, { status: 409 });
    if (!await claimAIRequest()) return Response.json({ error: "Hourly AI limit reached." }, { status: 429 });
    const prefs = (await readRecords()).filter(r => r.namespace === "daymark:news" && r.value !== null);
    const muted = new Set(prefs.filter(r => r.key.startsWith("mute:") && r.value === "true").map(r => r.key.slice(5)));
    const stories = (await getStories()).filter(s => !muted.has(s.source)).slice(0, 5);
    if (!stories.length) return Response.json({ error: "No recent stories to summarize." }, { status: 503 });
    const result = await generateAI(`Write a short headline briefing from these headlines ONLY. Do not imply that you read the full articles. Return JSON {"items":[{"id":"supplied story id","summary":"one sentence explaining the headline without adding facts"}]}. Headlines: ${JSON.stringify(stories.map(s => ({ id: s.id, title: s.title, source: s.source })))}`, "news-digest", { json: true, maxTokens: 1000, validate: v => { const items = (v as {items?: {id: string; summary: string}[]})?.items; return Array.isArray(items) && items.length > 0 && items.length <= 5 && new Set(items.map(i => i.id)).size === items.length && items.every(i => stories.some(s => s.id === i.id) && typeof i.summary === "string" && i.summary.length <= 1000); } });
    if (!result) return Response.json({ error: "AI digest unavailable. The original headlines are still available below." }, { status: 503 });
    const payload = { day, provider: result.provider, items: JSON.parse(result.text).items.map((i: {id: string; summary: string}) => ({ ...i, source: stories.find(s => s.id === i.id)?.source, url: stories.find(s => s.id === i.id)?.url })) };
    await db().execute({ sql: "UPDATE agent_cache SET value=? WHERE key=?", args: [JSON.stringify(payload), key] });
    return Response.json(payload);
  } catch { return Response.json({ error: "Digest unavailable. Please try again later." }, { status: 503 }); }
}
