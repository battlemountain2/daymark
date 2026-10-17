import { isSignedIn } from "@/lib/auth";
import { youtubeFeed, youtubeStatus, youtubeSubscriptions, setYouTubeChannels, disconnectYouTube } from "@/lib/youtube";
import { sameOriginRequest } from "@/lib/request-origin";
import { recordConnectionCheck } from "@/lib/connection-health";

const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  if (!(await isSignedIn())) return new Response(null, { status: 401 });
  try {
    const status = await youtubeStatus();
    if (!status.account) return Response.json({ ...status, data: [], checkedAt: null, stale: false }, { headers });
    const view = new URL(request.url).searchParams.get("view");
    const payload = view === "channels" ? await youtubeSubscriptions() : view === "status" ? {} : await youtubeFeed();
    if ("checkedAt" in payload && typeof payload.checkedAt === "string") await recordConnectionCheck("youtube", "warning" in payload ? String(payload.warning) : null, payload.checkedAt);
    return Response.json({ ...status, ...payload }, { headers });
  } catch (error) {
    const message = error instanceof Error && /YouTube|Connect|Reconnect/.test(error.message) ? error.message : "Could not load YouTube. Please try again.";
    await recordConnectionCheck("youtube", message).catch(() => {});
    return Response.json({ error: message }, { status: 502, headers });
  }
}
export async function PUT(request: Request) {
  if (!(await isSignedIn())) return new Response(null, { status: 401 });
  if (!sameOriginRequest(request)) return new Response(null, { status: 403 });
  try { await setYouTubeChannels((await request.json()).selected); return Response.json({ ok: true }, { headers }); }
  catch { return Response.json({ error: "Connect YouTube and choose up to 20 valid channels." }, { status: 400, headers }); }
}
export async function DELETE(request: Request) {
  if (!(await isSignedIn())) return new Response(null, { status: 401 });
  if (!sameOriginRequest(request)) return new Response(null, { status: 403 });
  await disconnectYouTube();
  return Response.json({ ok: true }, { headers });
}
