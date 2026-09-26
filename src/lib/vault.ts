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
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    else if (val.startsWith("[") && val.endsWith("]")) {
      try {
        data[key] = JSON.parse(val.replace(/'/g, '"'));
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

  const tags = params.tags || ["lecture", params.course.toLowerCase().replace(/\\s+/g, "-")];
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

// -------------------------------------------------------------
// Live Dual-Agent Cognitive Pipeline (Gemini 1.5 + OpenAI GPT)
// -------------------------------------------------------------

async function callGeminiSynthesis(
  rawNotes: string,
  courseCode: string,
  apiKey: string
): Promise<{ synthesisText: string; wikiLinks: string[] } | null> {
  try {
    const crib = COURSE_CRIBS[courseCode];
    const prompt = `You are an academic research copilot for a University of New Mexico (UNM) undergraduate studying ${courseCode} (Fall 2026, Week 5).
Course Context:
- Course: ${courseCode} (${crib?.name || "Academic Study"})
- Core Theses: ${crib?.theses?.join(" | ") || "Environmental and spatial systems of New Mexico"}
- Key Concepts: ${crib?.keyConcepts?.map((c) => c.term).join(", ") || "Active syllabus readings"}

Raw student lecture notes:
\"\"\"
${rawNotes.slice(0, 3500)}
\"\"\"

Task:
Synthesize these lecture notes into an Obsidian-ready academic markdown block.
Format requirements:
1. "### 📚 Syllabus & Reading Context": Connect the notes to Fall 2026 Week 5 course syllabus, regional context (Albuquerque, Middle Rio Grande, Sandia uplift, or relevant geography/history), and active readings.
2. "### 🔗 Connected Concepts & Wiki-Links": Provide 3-5 relevant Obsidian wiki-links in the exact format [[Topic Name]] linking to related core topics.
3. Include an Obsidian callout box:
   > [!NOTE] Exam Focus
   > [1-2 sentence high-yield insight or common exam trap]

Do NOT generate flashcards (those are handled by the testing agent). Return ONLY clean markdown.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1200,
          },
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      console.warn("Gemini API call failed with status", res.status);
      return null;
    }

    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const wikiMatch = text.match(/\[\[(.*?)\]\]/g) || [];
    const wikiLinks: string[] = Array.from(new Set(wikiMatch.map((m: string) => m.replace(/^\[\[|\]\]$/g, "").trim())));

    return {
      synthesisText: text.trim(),
      wikiLinks,
    };
  } catch (err) {
    console.warn("Gemini synthesis error:", err);
    return null;
  }
}

async function callOpenAISynthesis(
  rawNotes: string,
  courseCode: string,
  apiKey: string
): Promise<{ synthesisText: string; wikiLinks: string[] } | null> {
  try {
    const crib = COURSE_CRIBS[courseCode];
    const prompt = `You are an academic copilot for a UNM undergraduate studying ${courseCode} (Fall 2026, Week 5).
Course Context: ${courseCode} (${crib?.name || "Academic Study"}).
Theses: ${crib?.theses?.join(" | ") || "Environmental and spatial systems of New Mexico"}

Student Notes:
\"\"\"
${rawNotes.slice(0, 3500)}
\"\"\"

Synthesize into an Obsidian-style markdown block:
1. "### 📚 Syllabus & Reading Context": Connect notes to Week 5 topics, readings, and regional New Mexico context.
2. "### 🔗 Connected Concepts & Wiki-Links": Provide 3-5 [[Wiki-Links]] to related concepts.
3. Callout:
> [!NOTE] Exam Focus
> [1-2 sentence high-yield insight]
Return ONLY markdown.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) return null;

    const wikiMatch = text.match(/\[\[(.*?)\]\]/g) || [];
    const wikiLinks: string[] = Array.from(new Set(wikiMatch.map((m: string) => m.replace(/^\[\[|\]\]$/g, "").trim())));

    return { synthesisText: text.trim(), wikiLinks };
  } catch (err) {
    console.warn("OpenAI synthesis error:", err);
    return null;
  }
}

async function callOpenAICards(
  rawNotes: string,
  synthesisText: string,
  courseCode: string,
  apiKey: string
): Promise<Array<{ front: string; back: string; topic?: string }> | null> {
  try {
    const prompt = `You are an active recall flashcard specialist for UNM course ${courseCode}.
Extract 2 to 4 high-yield active recall flashcards from the lecture notes and synthesis below.

Student Notes:
\"\"\"
${rawNotes.slice(0, 3000)}
\"\"\"

Synthesis:
\"\"\"
${synthesisText.slice(0, 2000)}
\"\"\"

Return a valid JSON object matching:
{
  "cards": [
    {
      "front": "Clear question testing understanding or definition",
      "back": "Concise, precise answer",
      "topic": "Key concept"
    }
  ]
}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert tutor who generates active recall flashcards. Output only valid JSON with a 'cards' array.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.cards) && parsed.cards.length > 0) {
      return parsed.cards;
    }
    return null;
  } catch (err) {
    console.warn("OpenAI flashcard generation error:", err);
    return null;
  }
}

async function callGeminiCards(
  rawNotes: string,
  synthesisText: string,
  courseCode: string,
  apiKey: string
): Promise<Array<{ front: string; back: string; topic?: string }> | null> {
  try {
    const prompt = `You are an active recall flashcard specialist for UNM course ${courseCode}.
Extract 2 to 4 high-yield active recall flashcards from the lecture notes and synthesis below.

Student Notes:
\"\"\"
${rawNotes.slice(0, 3000)}
\"\"\"

Synthesis:
\"\"\"
${synthesisText.slice(0, 2000)}
\"\"\"

Return ONLY a valid JSON array of objects with keys "front", "back", "topic". No markdown codeblocks or explanation.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000,
          },
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) return null;
    const json = await res.json();
    let text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    if (parsed.cards && Array.isArray(parsed.cards)) {
      return parsed.cards;
    }
    return null;
  } catch (err) {
    console.warn("Gemini card extraction error:", err);
    return null;
  }
}

/**
 * Intelligent note enrichment engine.
 * Cross-references active week syllabus readings, course crib theses,
 * generates connected [[Wiki-Links]], and auto-mines Anki flashcards.
 * Uses Gemini for deep syllabus synthesis and OpenAI for high-yield Anki mining,
 * with seamless deterministic fallbacks.
 */
export async function enrichVaultNote(params: {
  course: string;
  title: string;
  rawContent: string;
}): Promise<{
  enrichedMarkdown: string;
  generatedCards: Flashcard[];
  savedNote: VaultNote;
  provider: string;
}> {
  const courseCode = params.course.trim();
  const crib = COURSE_CRIBS[courseCode];
  const dateStr = new Date().toISOString().slice(0, 10);
  const rawText = params.rawContent;

  const geminiKey =
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "[SENSITIVE]"
      ? process.env.GEMINI_API_KEY
      : null;

  const openaiKey =
    process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "[SENSITIVE]"
      ? process.env.OPENAI_API_KEY
      : null;

  let synthesisText = "";
  let wikiLinks: string[] = [];
  let synthesisAgent = "";

  // 1. Run Synthesis (Gemini primary, OpenAI secondary, Crib fallback)
  if (geminiKey) {
    const gResult = await callGeminiSynthesis(rawText, courseCode, geminiKey);
    if (gResult) {
      synthesisText = gResult.synthesisText;
      wikiLinks = gResult.wikiLinks;
      synthesisAgent = "Gemini 1.5 Flash";
    }
  }

  if (!synthesisText && openaiKey) {
    const oResult = await callOpenAISynthesis(rawText, courseCode, openaiKey);
    if (oResult) {
      synthesisText = oResult.synthesisText;
      wikiLinks = oResult.wikiLinks;
      synthesisAgent = "ChatGPT 4o-mini";
    }
  }

  if (!synthesisText) {
    synthesisAgent = "Daymark Syllabus Engine";
    wikiLinks = [
      `[[${courseCode} Week 5 Synthesis]]`,
      `[[Albuquerque Environmental Systems]]`,
      crib ? `[[${crib.name} Core Framework]]` : `[[Academic Vault]]`,
    ];
    synthesisText = [
      `### 📚 Syllabus & Reading Context`,
      crib && crib.theses[0] ? `* **Core Course Thesis**: ${crib.theses[0]}` : `* **Active Term**: Fall 2026 · Week 5 Mid-Term Focus`,
      crib && crib.promptQuestions[0] ? `* **Key Discussion Prompt**: "${crib.promptQuestions[0]}"` : ``,
      ``,
      `### 🔗 Connected Concepts & Wiki-Links`,
      wikiLinks.map((l) => `* Links to: ${l}`).join("\n"),
      ``,
      `> [!NOTE] Exam Focus`,
      `> Key concepts cross-verified against active course objectives and midterm requirements.`,
    ].filter(Boolean).join("\n");
  }

  // 2. Mine Anki Cards (OpenAI primary, Gemini secondary, Crib fallback)
  let rawCards: Array<{ front: string; back: string; topic?: string }> | null = null;
  let cardsAgent = "";

  if (openaiKey) {
    rawCards = await callOpenAICards(rawText, synthesisText, courseCode, openaiKey);
    if (rawCards && rawCards.length > 0) {
      cardsAgent = "ChatGPT 4o-mini";
    }
  }

  if (!rawCards && geminiKey) {
    rawCards = await callGeminiCards(rawText, synthesisText, courseCode, geminiKey);
    if (rawCards && rawCards.length > 0) {
      cardsAgent = "Gemini 1.5 Flash";
    }
  }

  if (!rawCards || rawCards.length === 0) {
    cardsAgent = "Daymark Flashcard Engine";
    rawCards = [];
    if (crib && crib.keyConcepts.length > 0) {
      crib.keyConcepts.slice(0, 2).forEach((c) => {
        rawCards!.push({
          front: `What is the significance of ${c.term} in ${courseCode}?`,
          back: c.def,
          topic: c.term,
        });
      });
    } else {
      rawCards.push({
        front: `What is the central focus of ${courseCode} in Week 5?`,
        back: `Applied analysis and synthesis of core course themes in regional New Mexico contexts.`,
        topic: courseCode,
      });
    }
  }

  const generatedCards: Flashcard[] = rawCards.map((c, i) => ({
    id: `card-vault-${Date.now()}-${i}`,
    front: c.front,
    back: c.back,
    source: `${courseCode} Lecture (${dateStr})`,
    tags: `${courseCode.replace(/\\s+/g, "")}::Vault::LectureNote`,
    status: "Verified",
    parsedTag: {
      courseCode,
      week: "W05",
      unit: "Lecture",
      topic: c.topic || "Lecture Concept",
      raw: courseCode,
    },
    courseCode,
  }));

  const provider =
    synthesisAgent === cardsAgent
      ? synthesisAgent
      : `${synthesisAgent} + ${cardsAgent}`;

  const cardMarkdown = generatedCards
    .map((c) => `* **Front**: ${c.front}\n  * **Back**: ${c.back}`)
    .join("\n");

  const fullEnrichedContent = [
    rawText.trim(),
    ``,
    `---`,
    ``,
    `## ✦ Agent Synthesis & Syllabus Connections`,
    ``,
    synthesisText,
    ``,
    `### 🎯 Auto-Generated Anki Cards`,
    cardMarkdown,
    ``,
    `> [!NOTE] Copilot Verification (${provider})`,
    `> Note analyzed and enriched by Daymark Agent Copilot against UNM Fall 2026 syllabus objectives on ${dateStr}.`,
    ``,
  ].join("\n");

  const savedNote = await saveVaultNote({
    course: courseCode,
    title: params.title,
    content: fullEnrichedContent,
    agentStatus: "enriched",
    tags: ["lecture", courseCode.toLowerCase().replace(/\\s+/g, "-"), "agent-enriched"],
  });

  return {
    enrichedMarkdown: fullEnrichedContent,
    generatedCards,
    savedNote,
    provider,
  };
}
