import { isSignedIn } from "@/lib/auth";
import { searchFollows, releaseSnapshotFor, validFollow } from "@/lib/release-radar";
export async function GET(req: Request) {
  if (!(await isSignedIn()))
    return Response.json({ error: "Sign in to Daymark." }, { status: 401 });
  const q = new URL(req.url).searchParams,
    provider = q.get("provider") || "",
    query = q.get("q"),
    id = q.get("id");
  if (!["tvmaze", "musicbrainz"].includes(provider))
    return Response.json(
      { error: "Choose a release source." },
      { status: 400 },
    );
  try {
    if (query && query.length >= 2 && query.length <= 100)
      return Response.json(
        { matches: await searchFollows(provider, query) },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    if (id && validFollow(provider, id))
      return Response.json(
        await releaseSnapshotFor(provider, id),
        { headers: { "Cache-Control": "private, no-store" } },
      );
    return Response.json(
      { error: "Enter a name or choose a valid follow." },
      { status: 400 },
    );
  } catch {
    return Response.json(
      {
        error:
          "This release source is unavailable. Your saved dates are still here.",
      },
      { status: 502 },
    );
  }
}
