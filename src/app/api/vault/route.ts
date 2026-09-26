import { NextResponse } from "next/server";
import { isSignedIn } from "@/lib/auth";
import { listVaultNotes, saveVaultNote, enrichVaultNote, answerCopilotQuery } from "@/lib/vault";

export async function GET(req: Request) {
  if (!(await isSignedIn())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const course = searchParams.get("course") || undefined;
  const notes = await listVaultNotes(course);

  return NextResponse.json({ notes });
}

export async function POST(req: Request) {
  if (!(await isSignedIn())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, course, title, content, rawContent, query, noteContext } = body;

    if (action === "ask_copilot") {
      const answer = await answerCopilotQuery({
        course: course || "General",
        query: query || "",
        noteContext: noteContext || "",
      });
      return NextResponse.json({ success: true, answer });
    }

    if (action === "handoff") {
      const result = await enrichVaultNote({
        course: course || "General",
        title: title || "Lecture Note",
        rawContent: rawContent || content || "",
      });
      return NextResponse.json({ success: true, ...result });
    }

    // Default: Save note
    const note = await saveVaultNote({
      course: course || "General",
      title: title || "Lecture Note",
      content: content || "",
    });

    return NextResponse.json({ success: true, note });
  } catch (err: any) {
    console.error("Vault API Error:", err);
    return NextResponse.json({ error: err.message || "Failed to process vault request" }, { status: 500 });
  }
}
