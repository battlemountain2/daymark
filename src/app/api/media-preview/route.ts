import { isSignedIn } from "@/lib/auth";
import { filmPreview } from "@/lib/media-preview";
export async function GET(req: Request) {
  if (!await isSignedIn()) return new Response(null, { status: 401 });
  const q = new URL(req.url).searchParams, title = q.get("title") || "", kind = q.get("kind") || "movie", year = q.get("year") || undefined, imdb = q.get("imdb") || undefined;
  if (!title.trim() || title.length > 160 || !["movie", "show", "anime"].includes(kind) || (year && !/^\d{4}$/.test(year)) || (imdb && !/^tt\d{1,12}$/.test(imdb))) return new Response(null, { status: 400 });
  try { return Response.json(await filmPreview(title, year, kind, imdb), { headers: { "Cache-Control": "private, max-age=86400" } }); }
  catch { return Response.json({ artwork: null }, { headers: { "Cache-Control": "no-store" } }); }
}
