import { NextResponse } from "next/server";
import { isSignedIn } from "@/lib/auth";

/**
 * The public VAPID key, which the browser needs to create a subscription.
 * Public by design — it is the private half that must never leave the server.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isSignedIn())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const key = process.env.VAPID_PUBLIC_KEY ?? null;
  return NextResponse.json({ key, configured: !!key });
}
