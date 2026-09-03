"use client";

import { useEffect, useState } from "react";
import type { Flashcard } from "@/lib/study-hub-types";
import {
  calculateNextSRS,
  loadSRSStore,
  saveSRSCard,
  INITIAL_SRS_STATE,
  type SRSGrade,
  type SRSStore,
} from "@/lib/spaced-repetition";

type Props = {
  dueCards: Flashcard[];
  onClose: () => void;
  onFinish?: () => void;
};

export default function QuickStudyModal({ dueCards, onClose, onFinish }: Props) {
  const [cards, setCards] = useState<Flashcard[]>(dueCards);
  const [idx, setIdx] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [srsStore, setSrsStore] = useState<SRSStore>({});
  const [reviewedCount, setReviewedCount] = useState<number>(0);

  useEffect(() => {
    setSrsStore(loadSRSStore());
    setCards(dueCards);
  }, [dueCards]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.key === "1") handleGrade(1);
      else if (e.key === "2") handleGrade(2);
      else if (e.key === "3") handleGrade(3);
      else if (e.key === "4") handleGrade(4);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [idx, cards, isFlipped]);

  const currentCard = cards[idx];

  const handleGrade = (grade: SRSGrade) => {
    if (!currentCard) return;
    const prevSRS = srsStore[currentCard.id] || INITIAL_SRS_STATE(currentCard.id);
    const updated = calculateNextSRS(prevSRS, grade);
    const newStore = saveSRSCard(updated);
    setSrsStore(newStore);
    setReviewedCount((r) => r + 1);

    if (idx + 1 < cards.length) {
      setIsFlipped(false);
      setIdx((i) => i + 1);
    } else {
      // Completed all due cards!
      setIdx(cards.length);
      if (onFinish) onFinish();
    }
  };

  const isComplete = idx >= cards.length;

  return (
    <div className="brief-modal-scrim" onClick={onClose} role="dialog" aria-modal="true">
      <div className="quick-study-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="qs-header">
          <div className="qs-title-row">
            <span className="pill mono live">⚡ Rapid Review</span>
            <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>
              {isComplete ? "Done!" : `Card ${idx + 1} of ${cards.length}`}
            </span>
          </div>
          <button type="button" className="brief-close-btn mono" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Card Body */}
        <div className="qs-body">
          {isComplete ? (
            <div className="qs-complete-state">
              <div className="qsc-icon">🎉</div>
              <h3>All Due Cards Reviewed!</h3>
              <p className="sub mono">
                You reviewed <b>{reviewedCount}</b> cards for today. Your spaced intervals have been updated.
              </p>
              <button type="button" className="qs-finish-btn mono" onClick={onClose}>
                Done &amp; Return to Dashboard
              </button>
            </div>
          ) : currentCard ? (
            <>
              <div
                className={`qs-card-display ${isFlipped ? "flipped" : ""}`}
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <div className="qs-card-topline mono">
                  <span className="qs-course-chip">{currentCard.courseCode}</span>
                  <span className="qs-flip-hint">[Space] Flip ↷</span>
                </div>

                <div className="qs-content">
                  <p className="qs-text">{isFlipped ? currentCard.back : currentCard.front}</p>
                </div>

                {isFlipped && currentCard.source && (
                  <div className="qs-card-botline mono">
                    <span>Source: {currentCard.source}</span>
                  </div>
                )}
              </div>

              {/* SM-2 Action Grading Buttons */}
              <div className="qs-rating-row mono">
                <button
                  type="button"
                  className="qs-grade-btn srs-again"
                  onClick={() => handleGrade(1)}
                  title="Press 1: Reset interval (1d)"
                >
                  [1] Again
                </button>
                <button
                  type="button"
                  className="qs-grade-btn srs-hard"
                  onClick={() => handleGrade(2)}
                  title="Press 2: Struggled (3d)"
                >
                  [2] Hard
                </button>
                <button
                  type="button"
                  className="qs-grade-btn srs-good"
                  onClick={() => handleGrade(3)}
                  title="Press 3: Solid recall (6d)"
                >
                  [3] Good
                </button>
                <button
                  type="button"
                  className="qs-grade-btn srs-easy"
                  onClick={() => handleGrade(4)}
                  title="Press 4: Instant recall (8d+)"
                >
                  [4] Easy
                </button>
              </div>

              <div className="qs-shortcuts-hint mono">
                <span>[Space] to flip answer</span>
                <span>[1–4] to grade recall</span>
                <span>[Esc] to close</span>
              </div>
            </>
          ) : (
            <div className="sub mono" style={{ textAlign: "center", padding: 30 }}>
              No cards are currently due for review!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
