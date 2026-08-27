import { NextResponse } from "next/server";
import { isSignedIn } from "@/lib/auth";
import { saveSub, deleteSub } from "@/lib/db";

export const dynamic = "force-dynamic";

const deny = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

export async function POST(req: Request) {
  if (!(await isSignedIn())) return deny();
  const body = await req.json().catch(() => null);
  const endpoint = String(body?.endpoint ?? "");
  const p256dh = String(body?.keys?.p256dh ?? "");
  const auth = String(body?.keys?.auth ?? "");
  if (!endpoint.startsWith("https://") || !p256dh || !auth) {
    return NextResponse.json({ error: "bad subscription" }, { status: 400 });
  }
  await saveSub({ endpoint, p256dh, auth });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await isSignedIn())) return deny();
  const body = await req.json().catch(() => null);
  const endpoint = String(body?.endpoint ?? "");
  if (endpoint) await deleteSub(endpoint);
  return NextResponse.json({ ok: true });
}
