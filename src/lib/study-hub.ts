import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import courseStatus from "@/data/study-hub/course-status.json";
import { type ColourKey } from "@/lib/term";
import {
  type CourseStudyInfo,
  type Flashcard,
  type StudyHubData,
  type WeeklyReviewData,
  calculateDeckStats,
  parseAnkiCsv,
} from "@/lib/study-hub-types";

export * from "@/lib/study-hub-types";

type CourseStatusRecord = Omit<CourseStudyInfo, "cards" | "deckStats" | "ck"> & {
  ck: ColourKey;
};

type CourseStatusFile = {
  activeTerm: string;
  currentWeekNumber: number;
  lastSynced: string;
  weeklyReview: WeeklyReviewData;
  courses: CourseStatusRecord[];
};

const status = courseStatus as CourseStatusFile;
const DATA_DIRECTORY = path.join(process.cwd(), "src", "data", "study-hub");

async function readAnkiCards(): Promise<Flashcard[]> {
  const names = (await readdir(DATA_DIRECTORY))
    .filter((name) => name.toLowerCase().endsWith(".csv"))
    .sort();
  const csvFiles = await Promise.all(
    names.map((name) => readFile(path.join(DATA_DIRECTORY, name), "utf8")),
  );

  const seen = new Set<string>();
  return csvFiles
    .flatMap((csv) => parseAnkiCsv(csv))
    .filter((card) => {
      if (seen.has(card.id)) return false;
      seen.add(card.id);
      return true;
    });
}

export async function getStudyHubData(): Promise<StudyHubData> {
  const activeCourseCodes = new Set(
    status.courses.map((c) => c.code.replace(/\s+/g, "").toUpperCase())
  );
  const rawCards = await readAnkiCards();
  const allCards = rawCards.filter((card) =>
    activeCourseCodes.has(card.courseCode.replace(/\s+/g, "").toUpperCase())
  );
  const courses: CourseStudyInfo[] = status.courses.map((course) => {
    const normalizedCourse = course.code.replace(/\s+/g, "").toUpperCase();
    const cards = allCards.filter(
      (card) => card.courseCode.replace(/\s+/g, "").toUpperCase() === normalizedCourse,
    );

    return {
      ...course,
      cards,
      deckStats: calculateDeckStats(cards),
    };
  });

  return {
    activeTerm: status.activeTerm,
    currentWeekNumber: status.currentWeekNumber,
    lastSynced: status.lastSynced,
    weeklyReview: status.weeklyReview,
    courses,
    allCards,
    overallDeckStats: calculateDeckStats(allCards),
  };
}
