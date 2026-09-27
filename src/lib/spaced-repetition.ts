import { cloudStorage } from "@/lib/cloud-storage";
/**
 * SuperMemo SM-2 Spaced Repetition Algorithm.
 *
 * Ratings:
 *   1 = Again (Blackout / Incorrect) -> Interval reset to 1 day, streak reset.
 *   2 = Hard (Struggled / Recalled with effort) -> Small interval increase, slight ease decrease.
 *   3 = Good (Correct response) -> Standard interval progression (1 -> 6 -> I * EF).
 *   4 = Easy (Instant recall) -> Accelerated interval progression + ease bonus.
 */

export type SRSGrade = 1 | 2 | 3 | 4;

export type SRSCardState = {
  cardId: string;
  reps: number;
  intervalDays: number;
  easeFactor: number;
  dueDate: string; // YYYY-MM-DD
  lastReviewed: string; // ISO string
  history: Array<{ date: string; grade: SRSGrade }>;
};

export const DEFAULT_EASE_FACTOR = 2.5;

export const INITIAL_SRS_STATE = (cardId: string): SRSCardState => ({
  cardId,
  reps: 0,
  intervalDays: 0,
  easeFactor: DEFAULT_EASE_FACTOR,
  dueDate: new Date().toISOString().slice(0, 10),
  lastReviewed: "",
  history: [],
});

/**
 * Calculates next review interval, reps, and ease factor using SM-2 algorithm.
 */
export function calculateNextSRS(
  current: SRSCardState,
  grade: SRSGrade,
  todayIso: string = new Date().toISOString().slice(0, 10)
): SRSCardState {
  let { reps, intervalDays, easeFactor } = current;

  // Grade mapping to SM-2 0-5 scale: 1 -> 1, 2 -> 3, 3 -> 4, 4 -> 5
  const sm2Quality = grade === 1 ? 1 : grade === 2 ? 3 : grade === 3 ? 4 : 5;

  if (grade === 1) {
    // Failed recall: reset repetitions, review tomorrow
    reps = 0;
    intervalDays = 1;
  } else {
    // Successful recall
    if (reps === 0) {
      intervalDays = 1;
    } else if (reps === 1) {
      intervalDays = grade === 2 ? 3 : grade === 4 ? 8 : 6;
    } else {
      const modifier = grade === 2 ? 0.85 : grade === 4 ? 1.3 : 1.0;
      intervalDays = Math.max(1, Math.round(intervalDays * easeFactor * modifier));
    }
    reps += 1;
  }

  // Update Ease Factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const qDiff = 5 - sm2Quality;
  easeFactor = easeFactor + (0.1 - qDiff * (0.08 + qDiff * 0.02));
  easeFactor = Math.max(1.3, Math.min(3.0, easeFactor));

  // Compute next due date
  const [y, m, d] = todayIso.split("-").map(Number);
  const nextDateObj = new Date(Date.UTC(y, m - 1, d) + intervalDays * 86400000);
  const dueDate = nextDateObj.toISOString().slice(0, 10);

  const history = [...(current.history || []), { date: todayIso, grade }];

  return {
    cardId: current.cardId,
    reps,
    intervalDays,
    easeFactor: Math.round(easeFactor * 100) / 100,
    dueDate,
    lastReviewed: new Date().toISOString(),
    history,
  };
}

export type SRSStore = Record<string, SRSCardState>;

const LOCAL_STORAGE_KEY = "daymark:srs:v1";

export function loadSRSStore(): SRSStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = cloudStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveSRSCard(state: SRSCardState): SRSStore {
  const store = loadSRSStore();
  store[state.cardId] = state;
  try {
    cloudStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
  } catch {}
  return store;
}

import type { Flashcard } from "@/lib/study-hub-types";

/**
 * Returns all cards due for spaced review today based on SM-2 state.
 */
export function getDueCards(
  cards: Flashcard[],
  todayIso: string,
  store: SRSStore
): Flashcard[] {
  const reviews = cards.filter(card => store[card.id] && store[card.id].dueDate <= todayIso);
  const introducedToday = Object.values(store).filter(s => s.history?.[0]?.date === todayIso).length;
  const newCards = cards.filter(card => !store[card.id]).slice(0, Math.max(0, 10 - introducedToday));
  return [...reviews, ...newCards];
}
