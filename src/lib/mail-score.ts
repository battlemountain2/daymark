/**
 * Ranking mail by what it costs to ignore.
 *
 * Ported from the artifact version, where it replaced a single regex over the
 * subject line. That regex could not tell "Scholarship Announcement" from
 * "Scholarship application closed", and scored an automated notice above a
 * professor writing to you directly.
 *
 * Not wired up yet — Outlook needs a Microsoft Graph app registration, which is
 * the one connector with real setup friction. See PHASE 2 in the README. The
 * logic is here and tested so that step is only plumbing.
 */

export type RawMail = {
  subject: string;
  from: string;
  senderName?: string;
  recipients: string[];
  receivedAt: string;
  isRead: boolean;
  summary?: string;
};

export type ScoredMail = {
  who: string;
  via: string;
  subject: string;
  why: string;
  receivedAt: string;
  /** 2 = act, 1 = worth knowing */
  priority: 1 | 2;
  unread: boolean;
  score: number;
};

const NOISE =
  /joinhandshake|golobos|goldenkey|notifications\.pearson|advising-help|thisweek@|ucam@|coursematerialsaccess|bkstr|mailchimp|constantcontact/i;

/** Canvas sends machine notices and instructor announcements from one address. */
const CANVAS_SYSTEM =
  /^(new file added|assignment graded|submission posted|recent canvas notifications|assignment created|grade change|course invitation)/i;

const MONEY: Array<[RegExp, string]> = [
  [/scholarship/i, "about a scholarship"],
  [/financial aid|fafsa/i, "about financial aid"],
  [/refund/i, "mentions a refund"],
  [/bursar|tuition|billing statement/i, "touches your bursar account"],
  [/\$[\d,]+/, "names a dollar amount"],
  [/payment|invoice|balance due/i, "about a payment"],
];

const DUEISH = /\b(due date|deadline|due by|due on|apply by|last day|expires?)\b/i;
const OFFICE = /noreplysfao|asadvise|asawards|onestop|touchnet|campuspayments|registrar|bursar/i;
const NOREPLY = /no-?reply|donotreply|notifications@/i;
const DATE_RE =
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i;

const WHO_MAP: Record<string, string> = {
  noreplysfao: "UNM Financial Aid", asadvise: "A&S Advising", asawards: "A&S Awards",
  onestopem: "UNM One Stop", geographyadvise: "Geography Advising",
  campuspayments: "UNM Bursar", registrar: "UNM Registrar",
  coursematerialsaccess: "UNM Bookstores",
};

function prettyWho(m: RawMail): string {
  const local = m.from.split("@")[0].toLowerCase();
  if (WHO_MAP[local]) return WHO_MAP[local];
  if (/instructure/i.test(m.from)) {
    const prof = (m.summary ?? "").match(/\bProf(?:essor)?\.?\s+([A-Z][a-zA-Z'-]+)/);
    return prof ? `Prof. ${prof[1]}` : "Canvas announcement";
  }
  if (m.senderName && m.senderName !== m.from && !m.senderName.includes("@")) return m.senderName;
  return local.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function scoreMail(m: RawMail, myAddress: string): ScoredMail | null {
  if (NOISE.test(m.from)) return null;
  const isCanvas = /instructure/i.test(m.from);
  if (isCanvas && CANVAS_SYSTEM.test(m.subject)) return null;

  const blob = `${m.subject}  ${m.summary ?? ""}`;
  // [rank, text] — lower rank is a more concrete reason, and shows first.
  const why: Array<[number, string]> = [];
  let score = 0;

  for (const [re, text] of MONEY) {
    if (re.test(blob)) { score += 3; why.push([3, text]); break; }
  }

  const date = blob.match(DATE_RE);
  if (date) { score += 3; why.push([1, `names a date: ${date[0].replace(/\s+/g, " ")}`]); }
  else if (DUEISH.test(blob)) { score += 2; why.push([1, "mentions a deadline"]); }

  const toMeOnly = m.recipients.length === 1 &&
    m.recipients[0].toLowerCase() === myAddress.toLowerCase();
  const toList = m.recipients.some((r) => /list\./i.test(r));

  if (toMeOnly) { score += 2; why.push([5, "sent only to you"]); }
  // A listserv blast still matters when it carries money and a deadline, so
  // this penalty stays small on purpose.
  if (toList) { score -= 2; why.push([7, "sent to a mailing list"]); }
  if (!m.isRead) score += 2;
  if (OFFICE.test(m.from)) score += 2;
  if (/^re:/i.test(m.subject)) { score += 2; why.push([2, "a reply to something you sent"]); }

  const announcement = isCanvas && !CANVAS_SYSTEM.test(m.subject);
  if (announcement) { score += 3; why.push([4, "an announcement your instructor wrote"]); }
  else if (NOREPLY.test(m.from)) score -= 2;

  if (/@unm\.edu$/i.test(m.from) && !OFFICE.test(m.from) && !NOREPLY.test(m.from)) {
    score += 2; why.push([6, "from a person, not a system"]);
  }

  if (score < 2) return null;

  const course = isCanvas && m.subject.match(/\b([A-Z]{2,4})-(\d{3,4}[A-Z]?)-\d+/);
  why.sort((a, b) => a[0] - b[0]);

  return {
    who: prettyWho(m),
    via: course ? `${course[1]} ${course[2]} · via Canvas` : m.from,
    subject: m.subject,
    why: why.slice(0, 2).map((w) => w[1]).join(" · "),
    receivedAt: m.receivedAt,
    priority: score >= 8 ? 2 : 1,
    unread: !m.isRead,
    score,
  };
}

export function rankMail(list: RawMail[], myAddress: string, limit = 6): ScoredMail[] {
  return list
    .map((m) => scoreMail(m, myAddress))
    .filter((x): x is ScoredMail => x !== null)
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.receivedAt < b.receivedAt ? 1 : -1))
    .slice(0, limit);
}
