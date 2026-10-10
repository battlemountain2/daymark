import { isSignedIn } from "@/lib/auth";
import { validFollow } from "@/lib/release-radar";
import { releaseArtwork } from "@/lib/media-preview";
export async function GET(req: Request) {
  if (!await isSignedIn()) return new Response(null, { status: 401 });
  const q = new URL(req.url).searchParams, provider = q.get("provider") || "", id = q.get("id") || "";
  if (!validFollow(provider, id)) return new Response(null, { status: 400 });
  try { return Response.json({ artwork: await releaseArtwork(provider, id) }, { headers: { "Cache-Control": "private, max-age=86400" } }); }
  catch { return Response.json({ artwork: null }, { headers: { "Cache-Control": "no-store" } }); }
}
