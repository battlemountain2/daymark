import { COURSE_CRIBS } from "@/lib/course-crib-data";
import { generateAI } from "./ai";
export interface TutorExplanation { intuition: string; mnemonic: string; localAnchor: string; provider: string }
export interface ExamQuestion { id: string; question: string; choices: string[]; correctIndex: number; explanation: string; concept: string }
export async function generateSocraticTutor(params: { front: string; back: string; courseCode: string; topic?: string }): Promise<TutorExplanation> {
  const result = await generateAI(`Explain this flashcard intuitively, give a mnemonic and a relevant concrete example. Return JSON with string keys intuition, mnemonic, localAnchor. Material: ${JSON.stringify(params)}`, "tutor", { json: true, maxTokens: 700, validate: value => { const v = value as TutorExplanation; return !!v && [v.intuition,v.mnemonic,v.localAnchor].every(s => typeof s === "string" && s.length > 0); } });
  return result ? { ...JSON.parse(result.text), provider: result.provider } : { intuition: params.back, mnemonic: "Restate the answer in your own words, then recall it without looking.", localAnchor: "Choose an example from your notes to check your understanding.", provider: "Saved material · AI unavailable" };
}
export async function generatePracticeExam(params: { courseCode: string; count?: number }): Promise<ExamQuestion[]> {
  const count = Math.min(10, Math.max(1, params.count || 5));
  const crib = COURSE_CRIBS[params.courseCode];
  const result = await generateAI(`Create exactly ${count} multiple-choice practice questions grounded in this course material: ${JSON.stringify(crib || {})}. Return JSON {"questions":[{"id":"q1","question":"...","choices":["...","...","...","..."],"correctIndex":0,"explanation":"...","concept":"..."}]}. Vary the correct answer position.`, "exam", { json: true, maxTokens: 3500, validate: value => {
    const questions = (value as { questions?: ExamQuestion[] })?.questions;
    return Array.isArray(questions) && questions.length === count && questions.every(q => q && typeof q.id === "string" && typeof q.question === "string" && typeof q.explanation === "string" && typeof q.concept === "string" && Array.isArray(q.choices) && q.choices.length === 4 && q.choices.every(c => typeof c === "string") && Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < 4);
  } });
  if (result) return JSON.parse(result.text).questions;
  return (crib?.keyConcepts || []).slice(0, count).map((c, i) => {
    const others = (crib?.keyConcepts || []).filter(x => x.term !== c.term).slice(0, 3).map(x => x.def);
    const choices = [...others]; choices.splice(i % 4, 0, c.def);
    return { id: `saved-${i}`, question: `[Saved material · AI unavailable] What describes ${c.term}?`, choices, correctIndex: Math.min(i % 4, others.length), explanation: c.def, concept: c.term };
  });
}
export async function generateFridayAISynthesis(params: { weekNum: string; takeaways: Array<{ course: string; title: string; detail: string }>; weakAreas: Array<{ course: string; topic: string; reason: string }>; scheduledDate: string }): Promise<string> {
  const result = await generateAI(`Write a concise weekly study memo with takeaways and specific next steps for weak areas. Only use the supplied material; do not claim a review has been completed. Material: ${JSON.stringify(params)}`, "weekly-review");
  return result ? `${result.text}\n\nAI draft · ${result.provider} · Check against your readings.` : `AI unavailable. Saved review material:\n\n${params.takeaways.map(t => `${t.course}: ${t.title} — ${t.detail}`).join("\n\n")}`;
}
export async function generateCommuteAdvisory(params: { classTitle: string; classWhere: string; classStart: string; driveMins: number; leaveByTime: string; minutesUntilLeave: number; weather?: { tempF?: number | null; windMph?: number | null; sky?: string | null } | null }): Promise<string> {
  const result = await generateAI(`Give a two-sentence campus commute advisory using these calculated times. Do not imply live traffic knowledge. ${JSON.stringify(params)}`, "commute", { maxTokens: 250 });
  return result ? `${result.text} (${result.provider})` : `Plan to leave by ${params.leaveByTime} for ${params.classTitle} at ${params.classWhere}. Schedule estimate · AI unavailable; live traffic not checked.`;
}
