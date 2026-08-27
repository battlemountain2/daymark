import { NextResponse } from "next/server";
import { isSignedIn } from "@/lib/auth";
import { getTerm, saveTerm } from "@/lib/get-term";
import { parseTerm } from "@/lib/term";

export const dynamic = "force-dynamic";

const deny = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

export async function GET() {
  if (!(await isSignedIn())) return deny();
  return NextResponse.json(await getTerm());
}

export async function POST(req: Request) {
  if (!(await isSignedIn())) return deny();
  const body = await req.json().catch(() => null);
  const term = parseTerm(body);
  // parseTerm drops malformed rows but refuses a term with a broken date range,
  // which would break every countdown and notification window at once.
  if (!term) {
    return NextResponse.json(
      { error: "A term needs a valid start and end date, with end after start." },
      { status: 400 }
    );
  }
  await saveTerm(term);
  return NextResponse.json({ ok: true, term });
}
