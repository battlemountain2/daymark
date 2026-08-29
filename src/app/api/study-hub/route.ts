import { NextResponse } from "next/server";
import { isSignedIn } from "@/lib/auth";
import { getStudyHubData } from "@/lib/study-hub";

export async function GET(req: Request) {
  if (!(await isSignedIn())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const course = searchParams.get("course");
  const data = await getStudyHubData();

  if (course) {
    const norm = course.replace(/\s+/g, "").toUpperCase();
    const filtered = data.courses.find((c) => c.code.replace(/\s+/g, "").toUpperCase() === norm);
    if (filtered) {
      return NextResponse.json({
        course: filtered,
        cards: filtered.cards,
        stats: filtered.deckStats,
      });
    }
  }

  return NextResponse.json(data);
}
