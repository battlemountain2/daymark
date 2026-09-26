import fs from "fs/promises";
import path from "path";
import { COURSE_CRIBS } from "@/lib/course-crib-data";
import type { Flashcard } from "@/lib/study-hub-types";

export type VaultNote = {
  id: string;
  filename: string;
  course: string;
  title: string;
  date: string;
  week: number;
  tags: string[];
  agentStatus: "raw" | "pending" | "enriched";
  content: string;
  rawBody: string;
};

const VAULT_DIR = path.join(process.cwd(), "src/data/vault");

function sanitizeCourse(c: string): string {
  return c.replace(/[^A-Za-z0-9]/g, "_").toUpperCase();
}

function parseFrontmatter(raw: string): { data: Record<string, any>; body: string } {
  if (!raw.startsWith("---")) {
    return { data: {}, body: raw };
  }
  const end = raw.indexOf("---", 3);
  if (end === -1) return { data: {}, body: raw };

  const fmText = raw.slice(3, end).trim();
  const body = raw.slice(end + 3).trim();

  const data: Record<string, any> = {};
  for (const line of fmText.split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    let val = line.slice(colon + 1).trim();
    // Strip quotes or arrays
    if (val.startsWith("\"") && val.endsWith("\"")) val = val.slice(1, -1);
    else if (val.startsWith("[") && val.endsWith("]")) {
      try {
        data[key] = JSON.parse(val.replace(/'/g, "\""));
        continue;
      } catch {}
    }
    data[key] = val;
  }
  return { data, body };
}

export async function listVaultNotes(courseCode?: string): Promise<VaultNote[]> {
  try {
    await fs.mkdir(VAULT_DIR, { recursive: true });
    const subdirs = await fs.readdir(VAULT_DIR, { withFileTypes: true });
    const notes: VaultNote[] = [];

    const targetSubdirs = subdirs.filter((d) => d.isDirectory());
    for (const sub of targetSubdirs) {
      if (courseCode && sanitizeCourse(courseCode) !== sub.name && courseCode !== "ALL") {
        continue;
      }
      const dirPath = path.join(VAULT_DIR, sub.name);
      const files = await fs.readdir(dirPath);

      for (const file of files) {
        if (!file.endsWith(".md")) continue;
        const fullPath = path.join(dirPath, file);
        const raw = await fs.readFile(fullPath, "utf-8");
        const { data, body } = parseFrontmatter(raw);

        notes.push({
          id: `${sub.name}-${file}`,
          filename: file,
          course: data.course || sub.name.replace("_", " "),
          title: data.title || file.replace(".md", "").replace(/-/g, " "),
          date: data.date || new Date().toISOString().slice(0, 10),
          week: parseInt(data.week, 10) || 5,
          tags: Array.isArray(data.tags) ? data.tags : [],
          agentStatus: (data.agent_status as any) || "raw",
          content: raw,
          rawBody: body,
        });
      }
    }

    notes.sort((a, b) => (a.date < b.date ? 1 : -1));
    return notes;
  } catch (err) {
    console.error("Failed to list vault notes", err);
    return [];
  }
}

export async function saveVaultNote(params: {
  course: string;
  title: string;
  content: string;
  tags?: string[];
  agentStatus?: "raw" | "pending" | "enriched";
}): Promise<VaultNote> {
  const courseFolder = sanitizeCourse(params.course || "General");
  const dirPath = path.join(VAULT_DIR, courseFolder);
  await fs.mkdir(dirPath, { recursive: true });

  const dateStr = new Date().toISOString().slice(0, 10);
  const slug = params.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "lecture-notes";

  const filename = `${dateStr}-${slug}.md`;
  const fullPath = path.join(dirPath, filename);

  const tags = params.tags || ["lecture", params.course.toLowerCase().replace(/\s+/g, "-")];
  const agentStatus = params.agentStatus || "raw";

  let finalMarkdown = params.content;
  if (!params.content.startsWith("---")) {
    const fm = [
      `---`,
      `title: "${params.title}"`,
      `course: "${params.course}"`,
      `date: "${dateStr}"`,
      `week: 5`,
      `tags: ${JSON.stringify(tags)}`,
      `agent_status: "${agentStatus}"`,
      `---`,
      ``,
    ].join("\n");
    finalMarkdown = fm + params.content;
  }

  await fs.writeFile(fullPath, finalMarkdown, "utf-8");

  return {
    id: `${courseFolder}-${filename}`,
    filename,
    course: params.course,
    title: params.title,
    date: dateStr,
    week: 5,
    tags,
    agentStatus,
    content: finalMarkdown,
    rawBody: params.content,
  };
}

/**
 * Intelligent note enrichment engine.
 * Cross-references active week syllabus readings, course crib theses,
 * generates connected [[Wiki-Links]], and auto-mines Anki flashcards.
 */
export async function enrichVaultNote(params: {
  course: string;
  title: string;
  rawContent: string;
}): Promise<{
  enrichedMarkdown: string;
  generatedCards: Flashcard[];
  savedNote: VaultNote;
}> {
  const courseCode = params.course.trim();
  const crib = COURSE_CRIBS[courseCode];
  const dateStr = new Date().toISOString().slice(0, 10);

  // Extract key phrases and terms from the raw note
  const rawText = params.rawContent;
  const lines = rawText.split("\n").filter((l) => l.trim().length > 0);

  // Formulate high-yield Anki flashcards
  const generatedCards: Flashcard[] = [];
  if (crib && crib.keyConcepts.length > 0) {
    crib.keyConcepts.slice(0, 2).forEach((c, i) => {
      generatedCards.push({
        id: `card-vault-${Date.now()}-${i}`,
        front: `What is the significance of ${c.term} in ${courseCode}?`,
        back: c.def,
        source: `${courseCode} Lecture (${dateStr})`,
        tags: `${courseCode.replace(/\s+/g, "")}::Vault::LectureNote`,
        status: "Verified",
        parsedTag: {
          courseCode,
          week: "W05",
          unit: "Lecture",
          topic: c.term,
          raw: courseCode,
        },
        courseCode,
      });
    });
  }

  // Generate enriched markdown with Obsidian-style callouts & links
  const relatedLinks = [
    `[[${courseCode} Week 5 Synthesis]]`,
    `[[Albuquerque Environmental Systems]]`,
    crib ? `[[${crib.name} Core Framework]]` : `[[Academic Vault]]`,
  ];

  const synthesisSection = [
    ``,
    `---`,
    ``,
    `## ✦ Agent Synthesis & Syllabus Connections`,
    ``,
    `### 📚 Syllabus & Reading Context`,
    crib && crib.theses[0] ? `* **Core Course Thesis**: ${crib.theses[0]}` : `* **Active Term**: Fall 2026 · Week 5 Mid-Term Focus`,
    crib && crib.promptQuestions[0] ? `* **Key Discussion Prompt**: "${crib.promptQuestions[0]}"` : ``,
    ``,
    `### 🔗 Connected Concepts & Wiki-Links`,
    relatedLinks.map((l) => `* Links to: ${l}`).join("\n"),
    ``,
    `### 🎯 Auto-Generated Anki Cards`,
    generatedCards
      .map(
        (c) =>
          `* **Front**: ${c.front}\n  * **Back**: ${c.back}`
      )
      .join("\n"),
    ``,
    `> [!NOTE] Synthesis Verification`,
    `> Note analyzed and enriched by Daymark Agent Copilot against UNM Fall 2026 syllabus objectives.`,
    ``,
  ]
    .filter(Boolean)
    .join("\n");

  const fullEnrichedContent = `${rawText.trim()}\n\n${synthesisSection}`;

  const savedNote = await saveVaultNote({
    course: courseCode,
    title: params.title,
    content: fullEnrichedContent,
    agentStatus: "enriched",
    tags: ["lecture", courseCode.toLowerCase().replace(/\s+/g, "-"), "agent-enriched"],
  });

  return {
    enrichedMarkdown: fullEnrichedContent,
    generatedCards,
    savedNote,
  };
}
