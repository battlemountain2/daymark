import { COURSE_CRIBS } from "@/lib/course-crib-data";

export interface TutorExplanation {
  intuition: string;
  mnemonic: string;
  localAnchor: string;
  provider: string;
}

export interface ExamQuestion {
  id: string;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  concept: string;
}

export async function generateSocraticTutor(params: {
  front: string;
  back: string;
  courseCode: string;
  topic?: string;
}): Promise<TutorExplanation> {
  const { front, back, courseCode, topic } = params;
  const crib = COURSE_CRIBS[courseCode] || COURSE_CRIBS["GEOG 1160"];

  const geminiKey =
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "[SENSITIVE]"
      ? process.env.GEMINI_API_KEY
      : null;

  const openaiKey =
    process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "[SENSITIVE]"
      ? process.env.OPENAI_API_KEY
      : null;

  const prompt = `You are an expert Socratic tutor for a University of New Mexico (UNM) undergraduate studying ${courseCode}.
The student is reviewing this flashcard:
- Question: "${front}"
- Answer: "${back}"
- Course / Topic: ${courseCode} (${topic || "Midterm Concept"})

Generate a 3-part study boost:
1. "intuition": 1-2 sentence plain-English mental model. Don't repeat the definition; explain how to visualize or conceptualize it intuitively.
2. "mnemonic": A catchy, memorable mental trigger, acronym, or rhyme to lock this in.
3. "localAnchor": A concrete connection to Albuquerque, the Middle Rio Grande, the Sandia Mountains, or New Mexico geography/history.

Return a valid JSON object matching:
{
  "intuition": "string",
  "mnemonic": "string",
  "localAnchor": "string"
}`;

  // 1. Try Gemini
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 600 },
          }),
          signal: AbortSignal.timeout(9000),
        }
      );

      if (res.ok) {
        const json = await res.json();
        let text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(text);
          if (parsed.intuition && parsed.mnemonic) {
            return {
              intuition: parsed.intuition,
              mnemonic: parsed.mnemonic,
              localAnchor: parsed.localAnchor || "Anchor to regional New Mexico systems.",
              provider: "Gemini 1.5 Flash",
            };
          }
        }
      }
    } catch (e) {
      console.warn("Tutor Gemini call failed", e);
    }
  }

  // 2. Try OpenAI
  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an expert tutor. Output valid JSON with intuition, mnemonic, and localAnchor keys.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(9000),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed.intuition && parsed.mnemonic) {
            return {
              intuition: parsed.intuition,
              mnemonic: parsed.mnemonic,
              localAnchor: parsed.localAnchor || "Anchor to regional New Mexico systems.",
              provider: "ChatGPT 4o-mini",
            };
          }
        }
      }
    } catch (e) {
      console.warn("Tutor OpenAI call failed", e);
    }
  }

  // 3. Deterministic Fallback
  return {
    intuition: `Focus on the underlying physical or historical mechanism: ${back.slice(0, 140)}...`,
    mnemonic: `Remember: "${front.slice(0, 30)}..." relates directly to ${courseCode} midterm core frameworks.`,
    localAnchor: `In New Mexico, this plays out across the Middle Rio Grande valley and the Rio Grande Rift uplift.`,
    provider: "Daymark Socratic Engine",
  };
}

export async function generatePracticeExam(params: {
  courseCode: string;
  count?: number;
}): Promise<ExamQuestion[]> {
  const { courseCode, count = 5 } = params;
  const crib = COURSE_CRIBS[courseCode] || COURSE_CRIBS["GEOG 1160"];

  const geminiKey =
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "[SENSITIVE]"
      ? process.env.GEMINI_API_KEY
      : null;

  const openaiKey =
    process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "[SENSITIVE]"
      ? process.env.OPENAI_API_KEY
      : null;

  const prompt = `You are a UNM professor designing a 5-question multiple choice midterm practice exam for ${courseCode} (${crib?.name}).
Course Theses:
${crib?.theses?.map((t) => `- ${t}`).join("\n")}

Key Concepts:
${crib?.keyConcepts?.map((c) => `- ${c.term}: ${c.def}`).join("\n")}

Generate exactly 5 realistic, conceptual midterm questions.
Schema: Return a valid JSON object matching:
{
  "questions": [
    {
      "id": "q1",
      "question": "Clear stem asking about a core concept",
      "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
      "correctIndex": 0,
      "explanation": "Why this answer is correct and what distractor traps exist.",
      "concept": "Core topic name"
    }
  ]
}`;

  // 1. Try Gemini
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 1800 },
          }),
          signal: AbortSignal.timeout(12000),
        }
      );

      if (res.ok) {
        const json = await res.json();
        let text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
            return parsed.questions;
          }
        }
      }
    } catch (e) {
      console.warn("Exam Gemini call failed", e);
    }
  }

  // 2. Try OpenAI
  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You generate university midterm exams. Return valid JSON with a 'questions' array.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
            return parsed.questions;
          }
        }
      }
    } catch (e) {
      console.warn("Exam OpenAI call failed", e);
    }
  }

  // 3. Deterministic Fallback Questions
  return (crib?.keyConcepts || []).slice(0, 5).map((c, i) => ({
    id: `q-fallback-${i}`,
    question: `In ${courseCode}, which statement most accurately describes ${c.term}?`,
    choices: [
      c.def,
      `It represents an obsolete 19th-century geological theory replaced by modern plate tectonics.`,
      `It is an exclusive function of Cartesian map coordinates with zero topological integrity.`,
      `It applies strictly to maritime oceanic environments and has no relevance to New Mexico.`,
    ],
    correctIndex: 0,
    explanation: `${c.term} is defined as: ${c.def}`,
    concept: c.term,
  }));
}

export async function generateFridayAISynthesis(params: {
  weekNum: string;
  takeaways: Array<{ course: string; title: string; detail: string }>;
  weakAreas: Array<{ course: string; topic: string; reason: string }>;
  scheduledDate: string;
}): Promise<string> {
  const { weekNum, takeaways, weakAreas, scheduledDate } = params;

  const geminiKey =
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "[SENSITIVE]"
      ? process.env.GEMINI_API_KEY
      : null;

  const openaiKey =
    process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "[SENSITIVE]"
      ? process.env.OPENAI_API_KEY
      : null;

  const prompt = `You are an executive academic synthesis advisor for a University of New Mexico undergraduate (Brayan) studying Geography and History (Fall 2026, Week ${weekNum}).
Review data:
- Date: ${scheduledDate}
- Core Takeaways:
${takeaways.map((t) => `* [${t.course}] ${t.title}: ${t.detail}`).join("\n")}
- Weak Spots Identified:
${weakAreas.map((w) => `* [${w.course}] ${w.topic}: ${w.reason}`).join("\n")}

Synthesize a high-caliber 1-page Academic Executive Brief in Markdown:
1. "# DAYMARK ACADEMIC EXECUTIVE BRIEF (Fall 2026 · Week ${weekNum})"
2. "## I. EXECUTIVE THEMATIC SYNTHESIS": 2 concise paragraphs synthesizing cross-course connections between New Mexico water history, Middle Rio Grande fluvial geomorphology, and geospatial analysis.
3. "## II. HIGH-YIELD COURSE TAKEAWAYS": Bullet points connecting each active course to midterm preparation.
4. "## III. WEAK SPOT TACTICAL MITIGATION": Concrete resolution plan for each identified weak spot.
5. "## IV. WEEK ${parseInt(weekNum, 10) + 1} TACTICAL DIRECTIVE": Actionable schedule goals.

Keep tone professional, clear, and deeply grounded in UNM Albuquerque academic contexts. Return only Markdown.`;

  // 1. Try Gemini
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 1500 },
          }),
          signal: AbortSignal.timeout(12000),
        }
      );
      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      }
    } catch (e) {
      console.warn("Friday AI synthesis Gemini error", e);
    }
  }

  // 2. Try OpenAI
  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 1500,
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text.trim();
      }
    } catch (e) {
      console.warn("Friday AI synthesis OpenAI error", e);
    }
  }

  return `# DAYMARK ACADEMIC EXECUTIVE BRIEF\n**Term**: Fall 2026 · Week ${weekNum}\n**Student**: Brayan | UNM\n\n## I. Weekly Synthesis\nCompleted weekly synthesis for GEOG 1160, GEOG 1160L, HIST 300, GEOG 1150, GEOG 1115L.`;
}

export async function generateCommuteAdvisory(params: {
  classTitle: string;
  classWhere: string;
  classStart: string;
  driveMins: number;
  leaveByTime: string;
  minutesUntilLeave: number;
  weather?: { tempF?: number | null; windMph?: number | null; sky?: string | null } | null;
}): Promise<string> {
  const { classTitle, classWhere, classStart, driveMins, leaveByTime, minutesUntilLeave, weather } = params;

  const geminiKey =
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "[SENSITIVE]"
      ? process.env.GEMINI_API_KEY
      : null;

  const openaiKey =
    process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "[SENSITIVE]"
      ? process.env.OPENAI_API_KEY
      : null;

  const prompt = `You are an Albuquerque UNM commute copilot.
Student route: Unser Blvd & Gibson Blvd SW (West Mesa) -> Gibson Blvd Bridge across Rio Grande -> UNM South Lot (1414 University Blvd) -> UNM Shuttle to Yale Mall -> Walk to ${classWhere}.
Class: ${classTitle} starts at ${classStart}.
Calculated drive time: ${driveMins}m.
Must leave home by: ${leaveByTime} (${minutesUntilLeave}m remaining).
Weather: ${weather?.tempF ?? 70}°F, ${weather?.windMph ?? 10} mph wind, ${weather?.sky ?? "clear"}.

Give a punchy, 2-sentence situational advisory for the drive. Mention the river crossing or weather if relevant. Keep it sharp and encouraging.`;

  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 200 },
          }),
          signal: AbortSignal.timeout(6000),
        }
      );
      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      }
    } catch (e) {
      console.warn("Commute Gemini advisory error", e);
    }
  }

  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 200,
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text.trim();
      }
    } catch (e) {
      console.warn("Commute OpenAI advisory error", e);
    }
  }

  return `West Mesa departure from Unser & Gibson: Aim for ${leaveByTime} to cross the Rio Grande with smooth buffer into South Lot for ${classTitle}.`;
}
