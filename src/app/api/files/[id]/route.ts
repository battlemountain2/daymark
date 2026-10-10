import { isSignedIn } from "@/lib/auth";
import { readFile } from "@/lib/private-files";
export const dynamic = "force-dynamic";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isSignedIn())) return new Response(null, { status: 401 });
  const { id } = await params;
  if (!/^[a-f0-9]{64}$/.test(id)) return new Response(null, { status: 404 });
  try {
    const file = await readFile(id);
    if (!file) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.type,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      },
    });
  } catch {
    return Response.json(
      { error: "File unavailable. Try again when connected." },
      { status: 503 },
    );
  }
}
