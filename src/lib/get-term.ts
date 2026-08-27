import { getSetting, setSetting } from "@/lib/db";
import { parseTerm, DEFAULT_TERM, type Term } from "@/lib/term";

/**
 * The current term, from the database, falling back to the hard-coded one.
 *
 * Server-side only by convention rather than by the `server-only` package: that
 * dependency bought a build-time guard and nothing else, and eliminating it
 * removes a variable from a build that fails on Vercel while passing locally.
 * Only server components and route handlers import this.
 *
 * The fallback matters more than it looks. A dead or unreachable database
 * should leave the dashboard showing a correct-for-now schedule, not an empty
 * week — the class schedule is the one thing on this page that needs no network
 * and it would be perverse for it to be the first casualty of a network fault.
 */
export async function getTerm(): Promise<Term> {
  try {
    const raw = await getSetting("term");
    if (!raw) return DEFAULT_TERM;
    return parseTerm(JSON.parse(raw)) ?? DEFAULT_TERM;
  } catch {
    return DEFAULT_TERM;
  }
}

export async function saveTerm(term: Term): Promise<void> {
  await setSetting("term", JSON.stringify(term));
}
