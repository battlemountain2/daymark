import { isSignedIn } from "@/lib/auth";
import { checkConnection, getConnections } from "@/lib/connections";
import { sameOriginRequest } from "@/lib/request-origin";

const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  if (!(await isSignedIn())) return new Response(null, { status: 401 });
  try { return Response.json(await getConnections(request), { headers }); }
  catch { return Response.json({ error: "Connections could not load. Check database availability and try again." }, { status: 503, headers }); }
}
export async function POST(request: Request) {
  if (!(await isSignedIn())) return new Response(null, { status: 401 });
  if (!sameOriginRequest(request)) return new Response(null, { status: 403 });
  try {
    const { id } = await request.json();
    if (!["youtube", "gmail", "music", "canvas", "weather", "media", "storage"].includes(id)) return Response.json({ error: "Choose an available connection." }, { status: 400, headers });
    await checkConnection(id);
    return Response.json(await getConnections(request), { headers });
  } catch { return Response.json({ error: "Could not complete the check. Try again later." }, { status: 503, headers }); }
}
