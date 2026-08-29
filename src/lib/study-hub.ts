import fs from "fs";
import path from "path";
import { type ColourKey } from "@/lib/term";
import {
  type Flashcard,
  type CourseStudyInfo,
  type StudyHubData,
  type WeeklyReviewData,
  parseAnkiCsv,
  calculateDeckStats,
} from "@/lib/study-hub-types";

export * from "@/lib/study-hub-types";

const COURSE_CK: Record<string, ColourKey> = {
  "GEOG 1160": "geo",
  "GEOG 1160L": "geo",
  "GEOG 1150": "geo",
  "GEOG 1115L": "geo",
  "HIST 300": "his",
  "POLS 2120": "pol",
  "PHED 2996": "fit",
};

export async function getStudyHubData(): Promise<StudyHubData> {
  const baseDir = path.join(process.cwd(), "src/data/study-hub");
  let allCards: Flashcard[] = [];
  let statusJson: any = null;

  try {
    const jsonPath = path.join(baseDir, "course-status.json");
    if (fs.existsSync(jsonPath)) {
      const raw = fs.readFileSync(jsonPath, "utf-8");
      statusJson = JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading course-status.json:", err);
  }

  try {
    if (fs.existsSync(baseDir)) {
      const files = fs.readdirSync(baseDir).filter((f) => f.endsWith(".csv"));
      for (const file of files) {
        const fullPath = path.join(baseDir, file);
        const content = fs.readFileSync(fullPath, "utf-8");
        const cards = parseAnkiCsv(content);
        allCards.push(...cards);
      }
    }
  } catch (err) {
    console.error("Error reading study-hub CSV files:", err);
  }

  const seen = new Set<string>();
  allCards = allCards.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  const rawCourses = statusJson?.courses || [];
  const weeklyReview: WeeklyReviewData = statusJson?.weeklyReview || {
    weekTitle: "Week 2 Synthesis & Review",
    scheduledReviewDate: "Friday, 8:00 PM (Weekly)",
    takeaways: [],
    weakAreas: [],
  };

  const courses: CourseStudyInfo[] = rawCourses.map((c: any) => {
    const code = c.code || "";
    const courseCards = allCards.filter((card) => {
      const normCard = card.courseCode.replace(/\s+/g, "").toUpperCase();
      const normCourse = code.replace(/\s+/g, "").toUpperCase();
      return normCard === normCourse || normCard.startsWith(normCourse);
    });

    const deckStats = calculateDeckStats(courseCards);

    return {
      code,
      name: c.name || code,
      where: c.where || "",
      ck: COURSE_CK[code] || c.ck || "adm",
      currentWeek: c.currentWeek || "Week 2",
      currentTopic: c.currentTopic || "Course Module",
      readings: c.readings || [],
      nextAssessment: c.nextAssessment,
      deckStats,
      cards: courseCards,
    };
  });

  const overallDeckStats = calculateDeckStats(allCards);

  return {
    activeTerm: statusJson?.activeTerm || "Fall 2026",
    currentWeekNumber: statusJson?.currentWeekNumber || 2,
    lastSynced: statusJson?.lastSynced || new Date().toISOString(),
    weeklyReview,
    courses,
    allCards,
    overallDeckStats,
  };
}
