import { NextResponse } from "next/server";
import { isSignedIn } from "@/lib/auth";
import { fetchAssignments, fetchSubmissions } from "@/lib/canvas";

export async function GET() {
  if (!(await isSignedIn())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ics = process.env.CANVAS_ICS_URL;
  if (!ics) return NextResponse.json({ error: "CANVAS_ICS_URL is not set" }, { status: 500 });

  try {
    const assignments = await fetchAssignments(ics);
    // Absent a token this is [], and the UI simply falls back to manual ticks.
    const submissions = await fetchSubmissions(
      process.env.CANVAS_BASE_URL ?? "https://canvas.unm.edu",
      process.env.CANVAS_API_TOKEN
    ).catch(() => []);
    return NextResponse.json({ assignments, submissions, hasToken: !!process.env.CANVAS_API_TOKEN });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
