import { isSignedIn } from "@/lib/auth";
import { ensureAI, providerConfig, claimAIRequest, generateAI, type Provider } from "@/lib/ai";
import { db } from "@/lib/db";
export const maxDuration = 60;
export async function GET() {
  if (!await isSignedIn()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await ensureAI();
    const recent = await db().execute("SELECT provider,action,ok,latency,tokens,error,created_at FROM agent_events ORDER BY created_at DESC LIMIT 20");
    const usage = await db().execute({ sql: "SELECT COUNT(*) requests,COALESCE(SUM(tokens),0) tokens FROM agent_events WHERE provider != 'fallback' AND created_at>=?", args: [new Date().toISOString().slice(0, 10)] });
    const providers = await Promise.all((["gemini", "openai"] as Provider[]).map(async provider => {
      const config = providerConfig(provider);
      const result = await db().execute({ sql: "SELECT ok,latency,error,created_at FROM agent_events WHERE provider=? ORDER BY created_at DESC LIMIT 1", args: [provider] });
      return { provider, configured: !!config.key, model: config.model, last: result.rows[0] || null };
    }));
    return Response.json({ providers, recent: recent.rows, usage: usage.rows[0] }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Agent status is temporarily unavailable." }, { status: 503 }); }
}
export async function POST() {
  if (!await isSignedIn()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    if (!await claimAIRequest()) return Response.json({ error: "Hourly AI limit reached." }, { status: 429 });
    await Promise.all((["gemini", "openai"] as Provider[]).map(only => generateAI("Reply with OK.", "connection-test", { only, maxTokens: 20 })));
    return GET();
  } catch { return Response.json({ error: "Connection test could not finish." }, { status: 503 }); }
}
