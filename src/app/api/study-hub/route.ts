import { NextResponse } from "next/server";
import { isSignedIn } from "@/lib/auth";
import { getStudyHubData } from "@/lib/study-hub";
import { claimAIRequest } from "@/lib/ai";
import { readInput, textField, InputError } from "@/lib/api-input";
export const maxDuration = 60;
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
    const body = await readInput(req) as Record<string, any>;
    const { action } = body;
    if (!["socratic_tutor", "generate_exam", "ai_friday_synthesis", "commute_advisory"].includes(action)) throw new InputError("Unknown action.");
    for (const key of ["front", "back", "courseCode", "topic", "weekNum", "scheduledDate", "classTitle", "classWhere", "classStart", "leaveByTime"]) if (body[key] !== undefined) textField(body, key);
    if (body.count !== undefined && (!Number.isInteger(body.count) || body.count < 1 || body.count > 10)) throw new InputError("Choose 1–10 questions.");
    for (const key of ["takeaways", "weakAreas"]) if (body[key] !== undefined && (!Array.isArray(body[key]) || body[key].length > 30 || !body[key].every((v: unknown) => v && typeof v === "object" && Object.values(v).every(x => typeof x === "string" && x.length <= 4000)))) throw new InputError(`Invalid ${key}.`);
    for (const key of ["driveMins", "minutesUntilLeave"]) if (body[key] !== undefined && (typeof body[key] !== "number" || !Number.isFinite(body[key]))) throw new InputError(`Invalid ${key}.`);
    if (!await claimAIRequest()) return NextResponse.json({ error: "Hourly AI limit reached. Try again next hour." }, { status: 429 });

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
  } catch (err) {
    return NextResponse.json({ error: err instanceof InputError ? err.message : "The study assistant is unavailable. Please try again." }, { status: err instanceof InputError ? 400 : 503 });
  }
}
