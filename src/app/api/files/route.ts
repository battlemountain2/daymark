import { isSignedIn } from "@/lib/auth";
import { listFiles, saveFile } from "@/lib/private-files";
export const dynamic = "force-dynamic";
const storageScope = () => process.env.TURSO_DATABASE_URL?.startsWith('file:') ? 'local' : 'shared';
export async function GET() {
  if (!(await isSignedIn())) return new Response(null, { status: 401 });
  try {
    return Response.json(
      { files: await listFiles(), storage: storageScope() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        error: "Private storage is unavailable. Your local file is unchanged.",
      },
      { status: 503 },
    );
  }
}
export async function POST(req: Request) {
  if (!(await isSignedIn())) return new Response(null, { status: 401 });
  const origin = req.headers.get("origin");
  if (
    origin &&
    new URL(origin).host !== (req.headers.get("host") || new URL(req.url).host)
  )
    return Response.json(
      { error: "Please upload from Daymark itself." },
      { status: 403 },
    );
  const limit = 3.5 * 1024 * 1024;
  const reader = req.body?.getReader();
  if (!reader)
    return Response.json({ error: "No file supplied" }, { status: 400 });
  try {
    let length = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > limit) {
        await reader.cancel();
        return Response.json(
          { error: "Choose a file under 3.5 MB." },
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    if (!length)
      return Response.json({ error: "The file is empty." }, { status: 400 });
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const name = decodeURIComponent(
      req.headers.get("x-file-name") || "Untitled",
    );
    const course = decodeURIComponent(
      req.headers.get("x-file-course") || "Personal",
    );
    const id = await saveFile(bytes, name, course);
    return Response.json(
      { id, files: await listFiles(), storage: storageScope() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        error:
          "Could not store this file. Use a PDF, JPEG, PNG, or WebP and try again.",
      },
      { status: 503 },
    );
  }
}
