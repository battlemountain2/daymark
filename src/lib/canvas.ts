/**
 * Canvas.
 *
 * Two independent sources, deliberately:
 *
 *   1. The ICS calendar feed — no auth, just a secret URL. Gives every
 *      assignment and its due date. This alone runs the To-do list.
 *   2. The REST API — needs a personal access token. Adds the two things the
 *      feed cannot express: real submission status, and grades.
 *
 * The app is fully useful with only (1). Treat (2) as an upgrade, and keep the
 * token server-side forever — it can act as Brayan on his whole Canvas account.
 */

export type Assignment = {
  /** "YYYY-MM-DD" */
  due: string;
  code: string;
  ck: "geo" | "pol" | "his" | "fit" | "adm";
  title: string;
  kind: 0 | 1 | 2; // 0 normal, 1 quiz, 2 exam
  /** Stable id. Must stay stable across refreshes: it keys the tick state. */
  id: string;
};

export const slug = (s: string): string =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);

/**
 * Key used for done/dismissed state.
 *
 * The slug intentionally collapses punctuation, so "Film 01 Assignment: The
 * Wilderness Idea" and "Film 01 Assignment - The Wilderness Idea" produce the
 * same key. Canvas is inconsistent about which it sends; without this, a tick
 * silently vanishes when the separator changes. Do not "tidy" this.
 */
export const assignmentKey = (due: string, title: string): string => `a:${due}:${slug(title)}`;

const SUBJECT_CK: Record<string, Assignment["ck"]> = {
  GEOG: "geo", POLS: "pol", HIST: "his", PHED: "fit",
};

/** "Film 01 [Intro Environmental Studies GEOG-1150-001]" -> code + colour. */
function courseFromSummary(summary: string) {
  const bracket = summary.match(/\s*\[([^\]]*)\]\s*$/);
  const title = bracket ? summary.slice(0, bracket.index).trim() : summary.trim();
  const course = bracket ? bracket[1] : "";
  const m = course.match(/([A-Za-z]{2,4})-(\d{3,4}[A-Za-z]?)-\d+/);
  const subject = m ? m[1].toUpperCase() : "";
  return {
    title,
    code: m ? `${subject} ${m[2].toUpperCase()}` : "canvas",
    ck: SUBJECT_CK[subject] ?? ("adm" as const),
  };
}

function kindOf(title: string): 0 | 1 | 2 {
  const t = title.toLowerCase();
  if (/\b(exam|final|midterm)\b/.test(t)) return 2;
  if (/\bquiz\b/.test(t)) return 1;
  return 0;
}

/**
 * Minimal iCalendar parser — enough for Canvas's feed, not a general one.
 * Handles RFC 5545 line folding (continuation lines start with a space).
 */
export function parseIcs(ics: string): Assignment[] {
  const unfolded = ics.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const out: Assignment[] = [];
  const seen = new Set<string>();

  for (const block of unfolded.split("BEGIN:VEVENT").slice(1)) {
    const body = block.split("END:VEVENT")[0];
    const summary = /^SUMMARY(?:;[^:]*)?:(.*)$/m.exec(body)?.[1]?.trim();
    const dtstart = /^DTSTART(?:;[^:]*)?:(.*)$/m.exec(body)?.[1]?.trim();
    if (!summary || !dtstart) continue;

    const digits = dtstart.replace(/[^0-9]/g, "");
    if (digits.length < 8) continue;
    const due = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;

    const { title, code, ck } = courseFromSummary(
      summary.replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\n/g, " ")
    );
    if (!title) continue;

    const id = assignmentKey(due, title);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ due, code, ck, title, kind: kindOf(title), id });
  }

  out.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));
  return out;
}

export async function fetchAssignments(icsUrl: string): Promise<Assignment[]> {
  const res = await fetch(icsUrl, {
    headers: { "User-Agent": "daymark" },
    // Canvas regenerates this feed slowly; an hour of cache is plenty.
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Canvas feed ${res.status}`);
  return parseIcs(await res.text());
}

/* ------------------------------------------------------------------ *
 * Optional: the REST API. Only reachable with a token.
 * ------------------------------------------------------------------ */

export type Submission = {
  assignmentId: number;
  courseId: number;
  submittedAt: string | null;
  grade: string | null;
  score: number | null;
  /** Canvas's own word: unsubmitted | submitted | graded | pending_review */
  workflowState: string;
};

/**
 * True submission status and grades — the thing email-scraping could only guess at.
 * Returns [] when no token is configured, so callers need no special case.
 */
export async function fetchSubmissions(
  baseUrl: string,
  token: string | undefined
): Promise<Submission[]> {
  if (!token) return [];
  const url = `${baseUrl}/api/v1/users/self/courses?enrollment_state=active&per_page=50`;
  const auth = { Authorization: `Bearer ${token}` };

  const courses: Array<{ id: number }> = await fetch(url, { headers: auth, cache: "no-store" })
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => []);

  const out: Submission[] = [];
  for (const c of courses) {
    const subs = await fetch(
      `${baseUrl}/api/v1/courses/${c.id}/students/submissions?student_ids[]=self&per_page=100`,
      { headers: auth, cache: "no-store" }
    )
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []);
    for (const s of subs as any[]) {
      out.push({
        assignmentId: s.assignment_id,
        courseId: c.id,
        submittedAt: s.submitted_at ?? null,
        grade: s.grade ?? null,
        score: s.score ?? null,
        workflowState: s.workflow_state ?? "unsubmitted",
      });
    }
  }
  return out;
}
