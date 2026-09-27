import fs from "node:fs/promises";
import path from "node:path";
import { db } from "./db";
import { generateAI } from "./ai";
import { getTerm } from "./get-term";
import { COURSE_CRIBS } from "./course-crib-data";
import type { Flashcard } from "./study-hub-types";
export type VaultNote = { id: string; filename: string; course: string; title: string; date: string; week: number; tags: string[]; agentStatus: "raw" | "pending" | "enriched"; content: string; rawBody: string };
let schema: Promise<void> | undefined;
async function ensureVault() {
  await (schema ||= (async () => {
    await db().execute(`CREATE TABLE IF NOT EXISTS vault_notes (id TEXT PRIMARY KEY, note TEXT NOT NULL, updated_at TEXT NOT NULL)`);
    // Import bundled legacy notes once per cold instance. INSERT OR IGNORE preserves edits.
    const root = path.join(process.cwd(), "src/data/vault");
    let folders;
    try { folders = await fs.readdir(root, { withFileTypes: true }); } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return; throw e; }
    for (const folder of folders.filter(f => f.isDirectory())) {
      for (const filename of (await fs.readdir(path.join(root, folder.name))).filter(f => f.endsWith(".md"))) {
        const content = await fs.readFile(path.join(root, folder.name, filename), "utf8");
        const frontmatter = content.match(/^---\s*\n([\s\S]*?)\n---/);
        const field = (key: string) => frontmatter?.[1].match(new RegExp(`^${key}:\\s*["']?(.*?)["']?$`, "m"))?.[1];
        const note: VaultNote = { id: `${folder.name}-${filename}`, filename, course: field("course") || folder.name.replaceAll("_", " "), title: field("title") || filename, date: field("date") || filename.slice(0, 10), week: Number(field("week")) || 1, tags: [], agentStatus: "raw", content, rawBody: content.replace(/^---\s*\n[\s\S]*?\n---\s*/, "") };
        await db().execute({ sql: "INSERT OR IGNORE INTO vault_notes(id,note,updated_at) VALUES(?,?,?)", args: [note.id, JSON.stringify(note), new Date().toISOString()] });
      }
    }
  })().catch(e => { schema = undefined; throw e; }));
}
export async function listVaultNotes(courseCode?: string): Promise<VaultNote[]> {
  await ensureVault();
  const result = await db().execute("SELECT note FROM vault_notes ORDER BY updated_at DESC");
  return result.rows.map(r => JSON.parse(String(r.note)) as VaultNote).filter(n => !courseCode || courseCode === "ALL" || n.course === courseCode);
}
export async function saveVaultNote(params: { id?: string; course: string; title: string; content: string; tags?: string[]; agentStatus?: "raw" | "pending" | "enriched" }): Promise<VaultNote> {
  await ensureVault();
  const term = await getTerm();
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver" }).format(new Date());
  const week = Math.max(1, Math.floor((Date.parse(date) - Date.parse(term.start)) / 604800000) + 1);
  const id = params.id || crypto.randomUUID();
  const note: VaultNote = { id, filename: `${date}-${id}.md`, course: params.course, title: params.title, date, week, tags: params.tags || [], agentStatus: params.agentStatus || "raw", content: params.content, rawBody: params.content.replace(/^---\s*\n[\s\S]*?\n---\s*/, "") };
  await db().execute({ sql: "INSERT INTO vault_notes(id,note,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET note=excluded.note,updated_at=excluded.updated_at", args: [id, JSON.stringify(note), new Date().toISOString()] });
  return note;
}
export async function enrichVaultNote(params: { course: string; title: string; rawContent: string }): Promise<{ enrichedMarkdown: string; generatedCards: Flashcard[]; savedNote: VaultNote; provider: string }> {
  const result = await generateAI(`Summarize these lecture notes and identify supported connections to the supplied course material. Never claim syllabus verification. Generate up to 5 flashcards from the notes only. Return JSON {"summary":"Markdown text","cards":[{"front":"question","back":"answer","topic":"topic"}]}. Course: ${params.course}. Reference: ${JSON.stringify(COURSE_CRIBS[params.course] || {})}. Notes: ${JSON.stringify(params.rawContent)}`, "vault-handoff", { json: true, maxTokens: 3000, validate: v => {
    const value = v as { summary?: string; cards?: { front: string; back: string; topic: string }[] };
    return !!value && typeof value.summary === "string" && Array.isArray(value.cards) && value.cards.length <= 5 && value.cards.every(c => c && [c.front,c.back,c.topic].every(t => typeof t === "string"));
  } });
  const data = result ? JSON.parse(result.text) : { summary: "AI is unavailable. Your original notes have been saved without generated additions.", cards: [] };
  const provider = result?.provider || "Original notes · AI unavailable";
  const generatedCards: Flashcard[] = data.cards.map((c: {front: string; back: string; topic: string}) => ({ id: crypto.randomUUID(), front: c.front, back: c.back, courseCode: params.course, source: `${params.title} · AI draft`, tags: `${params.course}::Vault`, status: "Needs review", parsedTag: { courseCode: params.course, week: "", unit: "Lecture", topic: c.topic, raw: params.course } }));
  const enrichedMarkdown = `${params.rawContent}\n\n## Study notes\n${data.summary}\n\n${provider} · Generated additions need review against your readings.`;
  const savedNote = await saveVaultNote({ course: params.course, title: params.title, content: enrichedMarkdown, agentStatus: result ? "enriched" : "raw" });
  return { enrichedMarkdown, generatedCards, savedNote, provider };
}
export async function answerCopilotQuery(params: { course: string; query: string; noteContext: string }): Promise<string> {
  const result = await generateAI(`Answer the student's question in 2–3 sentences grounded in these notes and course reference. Material: ${JSON.stringify({ ...params, reference: COURSE_CRIBS[params.course] })}`, "vault-question", { maxTokens: 450 });
  return result ? `${result.text}\n\n${result.provider} · AI draft` : "AI is unavailable right now. Your notes are safe; try again later or review the saved course material.";
}
