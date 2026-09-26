import { NextResponse } from "next/server";
import { isSignedIn } from "@/lib/auth";
import { getStudyHubData } from "@/lib/study-hub";
import {
  generateSocraticTutor,
  generatePracticeExam,
  generateFridayAISynthesis,
  generateCommuteAdvisory,
} from "@/lib/study-tutor";

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

export async function POST(req: Request) {
  if (!(await isSignedIn())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "socratic_tutor") {
      const { front, back, courseCode, topic } = body;
      const explanation = await generateSocraticTutor({
        front: front || "",
        back: back || "",
        courseCode: courseCode || "GEOG 1160",
        topic: topic || "",
      });
      return NextResponse.json({ success: true, explanation });
    }

    if (action === "generate_exam") {
      const { courseCode, count } = body;
      const questions = await generatePracticeExam({
        courseCode: courseCode || "GEOG 1160",
        count: count || 5,
      });
      return NextResponse.json({ success: true, questions });
    }

    if (action === "ai_friday_synthesis") {
      const { weekNum, takeaways, weakAreas, scheduledDate } = body;
      const memo = await generateFridayAISynthesis({
        weekNum: weekNum || "5",
        takeaways: takeaways || [],
        weakAreas: weakAreas || [],
        scheduledDate: scheduledDate || "Friday 8:00 PM",
      });
      return NextResponse.json({ success: true, memo });
    }

    if (action === "commute_advisory") {
      const { classTitle, classWhere, classStart, driveMins, leaveByTime, minutesUntilLeave, weather } = body;
      const advisory = await generateCommuteAdvisory({
        classTitle: classTitle || "Class",
        classWhere: classWhere || "Campus",
        classStart: classStart || "8:00 AM",
        driveMins: driveMins || 20,
        leaveByTime: leaveByTime || "7:30 AM",
        minutesUntilLeave: minutesUntilLeave || 15,
        weather,
      });
      return NextResponse.json({ success: true, advisory });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("Study Hub API error", err);
    return NextResponse.json({ error: err.message || "Failed to process request" }, { status: 500 });
  }
}
