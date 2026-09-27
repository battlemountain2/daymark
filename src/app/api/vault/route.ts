import { NextResponse } from "next/server";
import { isSignedIn } from "@/lib/auth";
import { listVaultNotes, saveVaultNote, enrichVaultNote, answerCopilotQuery } from "@/lib/vault";
import { claimAIRequest } from "@/lib/ai";
import { readInput, textField, InputError } from "@/lib/api-input";
export const maxDuration = 60;

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
    const body = await readInput(req);
    const action = textField(body, "action", "save", 40);
    if (!["save", "handoff", "ask_copilot"].includes(action)) throw new InputError("Unknown action.");
    const course = textField(body, "course", "General", 100), title = textField(body, "title", "Lecture Note", 200);
    const content = textField(body, "content", "", 40000), rawContent = textField(body, "rawContent", "", 20000);
    const query = textField(body, "query", "", 2000), noteContext = textField(body, "noteContext", "", 12000);
    if (action !== "save" && !await claimAIRequest()) return NextResponse.json({ error: "Hourly AI limit reached. Try again next hour." }, { status: 429 });

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
      id: body.id === undefined ? undefined : textField(body, "id", "", 100),
      course: course || "General",
      title: title || "Lecture Note",
      content: content || "",
    });

    return NextResponse.json({ success: true, note });
  } catch (err) {
    return NextResponse.json({ error: err instanceof InputError ? err.message : "Vault is unavailable. Your draft remains on this device." }, { status: err instanceof InputError ? 400 : 503 });
  }
}
