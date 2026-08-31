import { type ColourKey } from "@/lib/term";

export type CardStatus = "Draft" | "Verified" | "Needs review" | "Exported";

export type ParsedTag = {
  courseCode: string;
  week: string;
  unit: string;
  topic: string;
  raw: string;
};

export type Flashcard = {
  id: string;
  front: string;
  back: string;
  source: string;
  tags: string;
  status: CardStatus;
  parsedTag: ParsedTag;
  courseCode: string;
};

export type DeckStats = {
  total: number;
  verified: number;
  needsReview: number;
  draft: number;
  exported: number;
};

export type TakeawayItem = {
  course: string;
  title: string;
  detail: string;
  ck: ColourKey;
};

export type WeakAreaItem = {
  course: string;
  topic: string;
  reason: string;
  cardId?: string;
  ck: ColourKey;
};

export type CourseStudyInfo = {
  code: string;
  name: string;
  where: string;
  ck: ColourKey;
  currentWeek: string;
  currentTopic: string;
  readings: string[];
  resourceStatus?: "Ready" | "Partial" | "Waiting on Canvas";
  resourceNote?: string;
  driveUrl?: string;
  nextAssessment?: {
    title: string;
    due: string;
    type: string;
  };
  deckStats: DeckStats;
  cards: Flashcard[];
};

export type WeeklyReviewData = {
  weekTitle: string;
  scheduledReviewDate: string;
  takeaways: TakeawayItem[];
  weakAreas: WeakAreaItem[];
};

export type StudyHubData = {
  activeTerm: string;
  currentWeekNumber: number;
  lastSynced: string;
  weeklyReview: WeeklyReviewData;
  courses: CourseStudyInfo[];
  allCards: Flashcard[];
  overallDeckStats: DeckStats;
};

export function parseHierarchyTag(tagStr: string): ParsedTag {
  const clean = String(tagStr || "").trim();
  const parts = clean.split("::").map((p) => p.trim());
  return {
    courseCode: parts[0] || "GENERAL",
    week: parts[1] || "",
    unit: parts[2] || "",
    topic: parts.slice(3).join("::") || parts[2] || "",
    raw: clean,
  };
}

export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (insideQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        insideQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\r") {
        if (nextChar === "\n") i++;
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) rows.push(currentRow);
        currentRow = [];
        currentField = "";
      } else if (char === "\n") {
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) rows.push(currentRow);
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) rows.push(currentRow);
  }

  return rows;
}

export function parseAnkiCsv(csvContent: string): Flashcard[] {
  const rows = parseCsvRows(csvContent);
  if (rows.length <= 1) return [];

  const header = rows[0].map((h) => h.toLowerCase().trim());
  const idIdx = header.indexOf("id");
  const frontIdx = header.indexOf("front");
  const backIdx = header.indexOf("back");
  const sourceIdx = header.indexOf("source");
  const tagsIdx = header.indexOf("tags");
  const statusIdx = header.indexOf("status");

  const cards: Flashcard[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length < 3) continue;

    const front = frontIdx >= 0 ? row[frontIdx] : row[1] || "";
    const back = backIdx >= 0 ? row[backIdx] : row[2] || "";
    const fallbackSlug = front.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
    const id = idIdx >= 0 && row[idIdx] ? row[idIdx] : `card_${r}_${fallbackSlug || "untitled"}`;
    const source = sourceIdx >= 0 ? row[sourceIdx] : row[3] || "";
    const tags = tagsIdx >= 0 ? row[tagsIdx] : row[4] || "";
    const rawStatus = (statusIdx >= 0 ? row[statusIdx] : row[5] || "Draft").trim();

    let status: CardStatus = "Draft";
    if (/verified/i.test(rawStatus)) status = "Verified";
    else if (/needs review|review/i.test(rawStatus)) status = "Needs review";
    else if (/exported/i.test(rawStatus)) status = "Exported";

    const parsedTag = parseHierarchyTag(tags);
    const codeMatch = parsedTag.courseCode.match(/^([A-Za-z]+)(\d+.*)$/);
    const standardCourseCode = codeMatch ? `${codeMatch[1].toUpperCase()} ${codeMatch[2]}` : parsedTag.courseCode;

    if (front && back) {
      cards.push({
        id,
        front,
        back,
        source,
        tags,
        status,
        parsedTag,
        courseCode: standardCourseCode,
      });
    }
  }

  return cards;
}

export function calculateDeckStats(cards: Flashcard[]): DeckStats {
  const stats: DeckStats = { total: cards.length, verified: 0, needsReview: 0, draft: 0, exported: 0 };
  for (const c of cards) {
    if (c.status === "Verified") stats.verified++;
    else if (c.status === "Needs review") stats.needsReview++;
    else if (c.status === "Draft") stats.draft++;
    else if (c.status === "Exported") stats.exported++;
  }
  return stats;
}
