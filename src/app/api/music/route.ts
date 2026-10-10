import { isSignedIn } from "@/lib/auth";
import { getMusic } from "@/lib/music";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isSignedIn())) return new Response(null, { status: 401 });
  return Response.json(await getMusic(), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
