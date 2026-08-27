import { NextResponse } from "next/server";
import { checkPassphrase, startSession, endSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { passphrase } = await req.json().catch(() => ({ passphrase: "" }));
  if (typeof passphrase !== "string" || !checkPassphrase(passphrase)) {
    // Deliberately vague, and slow enough to discourage guessing.
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  await startSession();
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await endSession();
  return NextResponse.json({ ok: true });
}
