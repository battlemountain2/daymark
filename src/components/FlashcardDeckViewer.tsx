"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import type { Flashcard, CardStatus, CourseStudyInfo } from "@/lib/study-hub-types";
import {
  calculateNextSRS,
  loadSRSStore,
  saveSRSCard,
  INITIAL_SRS_STATE,
  type SRSGrade,
  type SRSStore,
} from "@/lib/spaced-repetition";
import { parseAnkiCsv } from "@/lib/study-hub-types";

type Props = {
  initialCards: Flashcard[];
  courses: CourseStudyInfo[];
  selectedCourseFilter?: string | null;
};

type QuizChoice = {
  text: string;
  isCorrect: boolean;
};

export default function FlashcardDeckViewer({
  initialCards,
  courses,
  selectedCourseFilter = null,
}: Props) {
  const [cards, setCards] = useState<Flashcard[]>(initialCards);
  const [activeCourse, setActiveCourse] = useState<string>(selectedCourseFilter || "ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"study" | "quiz" | "browse">("study");

  // SM-2 Spaced Repetition & Session Tracking
  const [srsStore, setSrsStore] = useState<SRSStore>({});
  const [sessionStreak, setSessionStreak] = useState<number>(0);
  const [sessionReviewed, setSessionReviewed] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Swipe gesture state
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);

  // Kahoot Quiz State
  const [quizChoices, setQuizChoices] = useState<QuizChoice[]>([]);
  const [selectedChoiceIdx, setSelectedChoiceIdx] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizTimer, setQuizTimer] = useState<number>(20);

  useEffect(() => {
    setSrsStore(loadSRSStore());
  }, []);

  useEffect(() => {
    setCards(initialCards);
  }, [initialCards]);

  useEffect(() => {
    if (selectedCourseFilter) {
      setActiveCourse(selectedCourseFilter);
      setCurrentIndex(0);
      setIsFlipped(false);
    }
  }, [selectedCourseFilter]);

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      if (activeCourse !== "ALL") {
        const normCourse = activeCourse.replace(/\s+/g, "").toUpperCase();
        const normCard = card.courseCode.replace(/\s+/g, "").toUpperCase();
        if (normCourse !== normCard && !normCard.startsWith(normCourse)) return false;
      }
      if (statusFilter !== "ALL" && card.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchFront = card.front.toLowerCase().includes(q);
        const matchBack = card.back.toLowerCase().includes(q);
        const matchSource = card.source.toLowerCase().includes(q);
        const matchTag = card.tags.toLowerCase().includes(q);
        if (!matchFront && !matchBack && !matchSource && !matchTag) return false;
      }
      return true;
    });
  }, [cards, activeCourse, statusFilter, searchQuery]);

  const currentCard: Flashcard | undefined = filteredCards[currentIndex];
  const currentSRS = currentCard ? (srsStore[currentCard.id] || INITIAL_SRS_STATE(currentCard.id)) : null;

  // Build 4 Kahoot-style quiz choices when current card changes
  useEffect(() => {
    if (viewMode !== "quiz" || !currentCard) return;

    setSelectedChoiceIdx(null);
    setQuizTimer(20);

    const otherAnswers = cards
      .filter((c) => c.id !== currentCard.id && c.back.trim() !== currentCard.back.trim())
      .map((c) => c.back);

    const shuffledOthers = [...otherAnswers].sort(() => Math.random() - 0.5);
    const distractors = shuffledOthers.slice(0, 3);

    const choices: QuizChoice[] = [
      { text: currentCard.back, isCorrect: true },
      ...distractors.map((t) => ({ text: t, isCorrect: false })),
    ].sort(() => Math.random() - 0.5);

    setQuizChoices(choices);
  }, [currentIndex, viewMode, currentCard, cards]);

  // Quiz timer countdown
  useEffect(() => {
    if (viewMode !== "quiz" || selectedChoiceIdx !== null) return;
    const interval = setInterval(() => {
      setQuizTimer((t) => {
        if (t <= 1) {
          handleQuizSelect(-1);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [viewMode, selectedChoiceIdx, currentIndex]);

  const handleNext = () => {
    if (filteredCards.length === 0) return;
    setIsFlipped(false);
    setSelectedChoiceIdx(null);
    setSwipeOffset(0);
    setCurrentIndex((prev) => (prev + 1) % filteredCards.length);
  };

  const handlePrev = () => {
    if (filteredCards.length === 0) return;
    setIsFlipped(false);
    setSelectedChoiceIdx(null);
    setSwipeOffset(0);
    setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
  };

  const handleFlip = () => {
    setIsFlipped((prev) => !prev);
  };

  const handleSRSGrade = (grade: SRSGrade) => {
    if (!currentCard) return;
    const prevSRS = srsStore[currentCard.id] || INITIAL_SRS_STATE(currentCard.id);
    const updated = calculateNextSRS(prevSRS, grade);
    const newStore = saveSRSCard(updated);
    setSrsStore(newStore);

    let newStatus: CardStatus = currentCard.status;
    if (grade === 1) {
      newStatus = "Needs review";
      setSessionStreak(0);
    } else if (grade >= 3) {
      newStatus = "Verified";
      setSessionStreak((s) => s + 1);
    }
    setCards((prev) => prev.map((c) => (c.id === currentCard.id ? { ...c, status: newStatus } : c)));
    setSessionReviewed((r) => r + 1);

    handleNext();
  };

  const handleQuizSelect = (choiceIdx: number) => {
    if (selectedChoiceIdx !== null) return;
    setSelectedChoiceIdx(choiceIdx);

    const isCorrect = choiceIdx >= 0 && quizChoices[choiceIdx]?.isCorrect;
    if (isCorrect) {
      setQuizScore((s) => s + 100 + quizTimer * 5);
      setSessionStreak((st) => st + 1);
      if (currentCard) {
        const prevSRS = srsStore[currentCard.id] || INITIAL_SRS_STATE(currentCard.id);
        const updated = calculateNextSRS(prevSRS, 3);
        setSrsStore(saveSRSCard(updated));
      }
    } else {
      setSessionStreak(0);
      if (currentCard) {
        const prevSRS = srsStore[currentCard.id] || INITIAL_SRS_STATE(currentCard.id);
        const updated = calculateNextSRS(prevSRS, 1);
        setSrsStore(saveSRSCard(updated));
      }
    }

    setTimeout(() => {
      handleNext();
    }, 1200);
  };

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const currentX = e.touches[0].clientX;
    setSwipeOffset(currentX - touchStartX);
  };

  const handleTouchEnd = () => {
    if (swipeOffset > 80) {
      handleSRSGrade(3);
    } else if (swipeOffset < -80) {
      handleSRSGrade(1);
    }
    setSwipeOffset(0);
    setTouchStartX(null);
    setIsSwiping(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "SELECT") return;

      if (viewMode === "study") {
        if (e.code === "Space") {
          e.preventDefault();
          handleFlip();
        } else if (e.code === "ArrowRight") {
          e.preventDefault();
          handleNext();
        } else if (e.code === "ArrowLeft") {
          e.preventDefault();
          handlePrev();
        } else if (isFlipped) {
          if (e.key === "1" && currentCard) handleSRSGrade(1);
          else if (e.key === "2" && currentCard) handleSRSGrade(2);
          else if (e.key === "3" && currentCard) handleSRSGrade(3);
          else if (e.key === "4" && currentCard) handleSRSGrade(4);
        }
      } else if (viewMode === "quiz") {
        if (["1", "2", "3", "4"].includes(e.key)) {
          const cIdx = parseInt(e.key, 10) - 1;
          if (cIdx < quizChoices.length) handleQuizSelect(cIdx);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentCard, filteredCards.length, isFlipped, viewMode, quizChoices]);

  const total = filteredCards.length;
  const verifiedCount = filteredCards.filter((c) => c.status === "Verified").length;
  const progressPct = total > 0 ? Math.round((verifiedCount / total) * 100) : 0;

  return (
    <div className="deck-viewer zen-mode">
      {/* Hidden File Input for CSV Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const txt = ev.target?.result as string;
              if (txt) {
                const imported = parseAnkiCsv(txt);
                setCards((p) => [...p, ...imported]);
              }
            };
            reader.readAsText(file);
          }
        }}
      />

      {/* 1. SINGLE SLEEK ZEN CONTROL BAR (Replaces the 5 cluttered rows) */}
      <div className="zen-toolbar">
        {/* Left: Course Deck Selector */}
        <div className="zen-left">
          <select
            className="zen-select mono"
            value={activeCourse}
            onChange={(e) => {
              setActiveCourse(e.target.value);
              setCurrentIndex(0);
              setIsFlipped(false);
            }}
          >
            <option value="ALL">All Decks ({cards.length})</option>
            {courses.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} ({c.cards.length})
              </option>
            ))}
          </select>

          {/* Quick Search Toggle */}
          <button
            type="button"
            className={`zen-icon-btn mono ${showSearch ? "on" : ""}`}
            onClick={() => setShowSearch(!showSearch)}
            title="Search cards"
          >
            🔍
          </button>
        </div>

        {/* Center: Mode Tabs */}
        <div className="zen-mode-toggle mono">
          <button
            type="button"
            className={`zen-mode-btn ${viewMode === "study" ? "on" : ""}`}
            onClick={() => setViewMode("study")}
          >
            3D Flip
          </button>
          <button
            type="button"
            className={`zen-mode-btn ${viewMode === "quiz" ? "on" : ""}`}
            onClick={() => setViewMode("quiz")}
          >
            ⚡ Quiz
          </button>
          <button
            type="button"
            className={`zen-mode-btn ${viewMode === "browse" ? "on" : ""}`}
            onClick={() => setViewMode("browse")}
          >
            Browse
          </button>
        </div>

        {/* Right: Streak, Mastery Pill & CSV Import */}
        <div className="zen-right mono">
          {sessionStreak > 0 && (
            <span className="zen-streak-pill" title="Current session streak">
              🔥 {sessionStreak}
            </span>
          )}
          <span className="zen-mastery-pill" title={`${verifiedCount} of ${total} verified`}>
            {progressPct}% Verified
          </span>
          <button
            type="button"
            className="zen-icon-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Import Anki CSV"
          >
            📥
          </button>
        </div>
      </div>

      {/* Collapsible Search Input (Only shown when 🔍 is clicked) */}
      {showSearch && (
        <div className="zen-search-dropdown">
          <input
            type="text"
            className="zen-search-input mono"
            placeholder="Search questions, answers, or tags..."
            value={searchQuery}
            autoFocus
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentIndex(0);
            }}
          />
          {searchQuery && (
            <button
              type="button"
              className="zen-search-clear mono"
              onClick={() => setSearchQuery("")}
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* MODE 1: 3D FLIP WITH DYNAMIC ANSWER-FIRST CONTROLS */}
      {viewMode === "study" && (
        <div className="deck-study-area zen-study-area">
          {filteredCards.length === 0 ? (
            <div className="deck-empty mono">No flashcards match the current deck filter.</div>
          ) : currentCard ? (
            <>
              <div
                className={`flashcard-scene ${isFlipped ? "flipped" : ""}`}
                style={{
                  transform: swipeOffset !== 0 ? `translateX(${swipeOffset}px) rotate(${swipeOffset * 0.05}deg)` : undefined,
                  transition: isSwiping ? "none" : "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={handleFlip}
                role="button"
                tabIndex={0}
                aria-label={`Flashcard ${currentIndex + 1} of ${total}. Tap to flip, swipe left for Again, right for Good.`}
              >
                <div className="flashcard-inner">
                  {/* Front Side (Question) */}
                  <div className="flashcard-face flashcard-front">
                    <div className="card-topline">
                      <span className="course-chip mono">{currentCard.courseCode}</span>
                      <span className={`status-chip mono ${currentCard.status.toLowerCase().replace(/\s+/g, "-")}`}>
                        {currentCard.status}
                      </span>
                      <span className="card-counter mono">
                        {currentIndex + 1} / {total}
                      </span>
                    </div>

                    <div className="card-question">
                      <p>{currentCard.front}</p>
                    </div>

                    <div className="card-bottomline">
                      <span className="source-cite mono">
                        {currentCard.source ? `Source: ${currentCard.source}` : "Active Deck"}
                      </span>
                      <span className="flip-hint mono">
                        [Space] Reveal Answer ↷
                      </span>
                    </div>
                  </div>

                  {/* Back Side (Answer) */}
                  <div className="flashcard-face flashcard-back">
                    <div className="card-topline">
                      <span className="course-chip mono">{currentCard.courseCode} · Answer</span>
                      <span className={`status-chip mono ${currentCard.status.toLowerCase().replace(/\s+/g, "-")}`}>
                        {currentCard.status}
                      </span>
                      <span className="card-counter mono">
                        {currentIndex + 1} / {total}
                      </span>
                    </div>

                    <div className="card-answer">
                      <p>{currentCard.back}</p>
                    </div>

                    <div className="card-bottomline">
                      <span className="tag-string mono">
                        🏷️ {currentCard.tags || currentCard.parsedTag.raw}
                      </span>
                      {currentSRS && currentSRS.reps > 0 && (
                        <span className="srs-meta mono">
                          Rep #{currentSRS.reps} · Interval: {currentSRS.intervalDays}d
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* DYNAMIC ACTION BAR: Changes seamlessly between Question and Answer */}
              <div className="zen-action-bar">
                {!isFlipped ? (
                  /* Question State: Reveal Answer + Previous / Next Navigation */
                  <div className="zen-question-actions mono">
                    <button type="button" className="zen-nav-btn" onClick={handlePrev}>
                      ← Prev
                    </button>
                    <button type="button" className="zen-reveal-btn primary" onClick={handleFlip}>
                      [Space] Reveal Answer ↷
                    </button>
                    <button type="button" className="zen-nav-btn" onClick={handleNext}>
                      Next →
                    </button>
                  </div>
                ) : (
                  /* Answer State: 4 Clean Rating Buttons + Quick Flip Back */
                  <div className="zen-answer-actions mono">
                    <button
                      type="button"
                      className="srs-btn srs-again"
                      onClick={() => handleSRSGrade(1)}
                      title="Press 1: Reset interval (1d)"
                    >
                      <span className="srs-lbl">[1] Again</span>
                      <small>1d reset</small>
                    </button>
                    <button
                      type="button"
                      className="srs-btn srs-hard"
                      onClick={() => handleSRSGrade(2)}
                      title="Press 2: Hard recall"
                    >
                      <span className="srs-lbl">[2] Hard</span>
                      <small>3d</small>
                    </button>
                    <button
                      type="button"
                      className="srs-btn srs-good"
                      onClick={() => handleSRSGrade(3)}
                      title="Press 3: Good recall"
                    >
                      <span className="srs-lbl">[3] Good</span>
                      <small>6d</small>
                    </button>
                    <button
                      type="button"
                      className="srs-btn srs-easy"
                      onClick={() => handleSRSGrade(4)}
                      title="Press 4: Instant recall"
                    >
                      <span className="srs-lbl">[4] Easy</span>
                      <small>8d+</small>
                    </button>
                  </div>
                )}
              </div>

              {/* Minimal Keyboard Hint */}
              <div className="zen-shortcuts-hint mono">
                <span>{!isFlipped ? "[Space] Reveal" : "[1–4] Rate recall"}</span>
                <span>[← / →] Skip</span>
                <span>[Swipe ↔] Mobile</span>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* MODE 2: KAHOOT-STYLE QUIZ SPRINT */}
      {viewMode === "quiz" && (
        <div className="quiz-sprint-container">
          {currentCard ? (
            <div className="quiz-card-box">
              <div className="qc-header mono">
                <div className="qc-left">
                  <span className="course-chip">{currentCard.courseCode}</span>
                  <span className="sub">{currentIndex + 1} / {total}</span>
                </div>
                <div className="qc-timer">
                  <span className={`qc-clock ${quizTimer <= 5 ? "urgent" : ""}`}>
                    ⏳ {quizTimer}s
                  </span>
                </div>
              </div>

              <div className="qc-question-box">
                <p className="qc-question-text">{currentCard.front}</p>
              </div>

              {/* 4 Kahoot-Style Choice Blocks */}
              <div className="qc-choices-grid">
                {quizChoices.map((choice, idx) => {
                  const isSelected = selectedChoiceIdx === idx;
                  const isAnswered = selectedChoiceIdx !== null;
                  let stateClass = "";

                  if (isAnswered) {
                    if (choice.isCorrect) stateClass = "correct";
                    else if (isSelected) stateClass = "wrong";
                    else stateClass = "dimmed";
                  }

                  const icons = ["▲", "◆", "●", "■"];

                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`qc-choice-btn choice-${idx} ${stateClass}`}
                      onClick={() => handleQuizSelect(idx)}
                      disabled={isAnswered}
                    >
                      <span className="qcb-icon mono">{icons[idx]}</span>
                      <span className="qcb-text">{choice.text}</span>
                    </button>
                  );
                })}
              </div>

              <div className="qc-footer mono">
                <span>[Keys 1–4] Instant select</span>
                <button type="button" className="deck-btn sm-btn" onClick={handleNext}>
                  Skip →
                </button>
              </div>
            </div>
          ) : (
            <div className="deck-empty mono">No cards available for quiz.</div>
          )}
        </div>
      )}

      {/* MODE 3: BROWSE TABLE VIEW */}
      {viewMode === "browse" && (
        <div className="deck-table-wrap">
          <table className="deck-table">
            <thead>
              <tr className="mono">
                <th style={{ width: 110 }}>Course</th>
                <th style={{ width: 110 }}>Status</th>
                <th>Front (Question)</th>
                <th>Back (Answer)</th>
                <th style={{ width: 160 }}>Source / Tags</th>
              </tr>
            </thead>
            <tbody>
              {filteredCards.map((c) => (
                <tr key={c.id}>
                  <td className="mono">{c.courseCode}</td>
                  <td>
                    <span className={`status-chip mono ${c.status.toLowerCase().replace(/\s+/g, "-")}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="table-front">{c.front}</td>
                  <td className="table-back">{c.back}</td>
                  <td className="mono table-meta">
                    <div className="t-src">{c.source}</div>
                    <div className="t-tag">{c.tags}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
