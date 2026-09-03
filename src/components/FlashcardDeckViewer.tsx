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
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"study" | "quiz" | "browse">("study");

  // SM-2 Spaced Repetition & Session Tracking
  const [srsStore, setSrsStore] = useState<SRSStore>({});
  const [sessionStreak, setSessionStreak] = useState<number>(0);
  const [sessionReviewed, setSessionReviewed] = useState<number>(0);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
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

    // Shuffle and pick 3 distractors
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
          handleQuizSelect(-1); // Timeout
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

  // Touch Swipe Handlers (Tinder-style)
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
      // Swiped Right -> Good [3]
      handleSRSGrade(3);
    } else if (swipeOffset < -80) {
      // Swiped Left -> Again [1]
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
        } else if (e.key === "1" && currentCard) handleSRSGrade(1);
        else if (e.key === "2" && currentCard) handleSRSGrade(2);
        else if (e.key === "3" && currentCard) handleSRSGrade(3);
        else if (e.key === "4" && currentCard) handleSRSGrade(4);
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

  // Drag & Drop CSV Importer
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith(".csv")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          const imported = parseAnkiCsv(text);
          if (imported.length > 0) {
            setCards((prev) => {
              const ids = new Set(prev.map((c) => c.id));
              const fresh = imported.filter((c) => !ids.has(c.id));
              return [...prev, ...fresh];
            });
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const total = filteredCards.length;
  const verifiedCount = filteredCards.filter((c) => c.status === "Verified").length;
  const needsReviewCount = filteredCards.filter((c) => c.status === "Needs review").length;
  const progressPct = total > 0 ? Math.round((verifiedCount / total) * 100) : 0;

  return (
    <div
      className={`deck-viewer ${isDraggingFile ? "drag-over" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
      onDragLeave={() => setIsDraggingFile(false)}
      onDrop={handleDrop}
    >
      {/* Session Progress Ribbon */}
      <div className="srs-session-ribbon mono">
        <div className="ssr-item">
          <span className="sub">Reviewed:</span> <b>{sessionReviewed}</b>
        </div>
        <div className="ssr-item">
          <span className="sub">Streak:</span> <b>🔥 {sessionStreak}</b>
        </div>
        {viewMode === "quiz" && (
          <div className="ssr-item">
            <span className="sub">Score:</span> <b>⚡ {quizScore} pts</b>
          </div>
        )}
        <div className="ssr-item">
          <span className="sub">Mastery:</span> <b>{progressPct}% Verified</b>
        </div>
        <div className="ssr-item file-drop-cta" onClick={() => fileInputRef.current?.click()}>
          <span className="sub">📥 Drop CSV here</span>
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
        </div>
      </div>

      {/* Header Controls & Mode Switcher */}
      <div className="deck-header">
        <div className="deck-nav-pills">
          <button
            type="button"
            className={`deck-pill mono ${activeCourse === "ALL" ? "on" : ""}`}
            onClick={() => {
              setActiveCourse("ALL");
              setCurrentIndex(0);
              setIsFlipped(false);
            }}
          >
            All Decks ({cards.length})
          </button>
          {courses.map((c) => (
            <button
              key={c.code}
              type="button"
              className={`deck-pill mono ${activeCourse === c.code ? "on" : ""}`}
              onClick={() => {
                setActiveCourse(c.code);
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
            >
              <span className={`tagdot ${c.ck}`} />
              {c.code} ({c.cards.length})
            </button>
          ))}
        </div>

        {/* Mode Switcher */}
        <div className="deck-mode-toggle">
          <button
            type="button"
            className={`mono sm-btn ${viewMode === "study" ? "on" : ""}`}
            onClick={() => setViewMode("study")}
          >
            3D Flip
          </button>
          <button
            type="button"
            className={`mono sm-btn ${viewMode === "quiz" ? "on" : ""}`}
            onClick={() => setViewMode("quiz")}
          >
            ⚡ Quiz Sprint
          </button>
          <button
            type="button"
            className={`mono sm-btn ${viewMode === "browse" ? "on" : ""}`}
            onClick={() => setViewMode("browse")}
          >
            Browse
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="deck-toolbar">
        <div className="deck-search-wrap">
          <input
            type="text"
            className="deck-search-input mono"
            placeholder="Search questions, concepts, or tags..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentIndex(0);
            }}
          />
          {searchQuery && (
            <button
              type="button"
              className="deck-search-clear mono"
              onClick={() => setSearchQuery("")}
            >
              ✕
            </button>
          )}
        </div>

        <div className="deck-status-filters">
          <span className="mono filter-label">Status:</span>
          {["ALL", "Verified", "Needs review", "Draft"].map((st) => (
            <button
              key={st}
              type="button"
              className={`mono deck-filter-pill ${statusFilter === st ? "on" : ""}`}
              onClick={() => {
                setStatusFilter(st);
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
            >
              {st === "ALL" ? `All (${total})` : st}
            </button>
          ))}
        </div>
      </div>

      {/* Minimalist Progress Line (Weird Bar Fix) */}
      <div className="minimal-prog-container">
        <div className="minimal-prog-track">
          <div className="minimal-prog-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="deck-stats-labels mono">
          <span className="stat-v"><b>{verifiedCount}</b> verified ({progressPct}%)</span>
          <span className="stat-r"><b>{needsReviewCount}</b> need review</span>
          <span className="stat-tot">{total} cards</span>
        </div>
      </div>

      {/* MODE 1: 3D FLIP WITH MOBILE SWIPE */}
      {viewMode === "study" && (
        <div className="deck-study-area">
          {filteredCards.length === 0 ? (
            <div className="deck-empty mono">No flashcards match the current filter.</div>
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
                  {/* Front Side */}
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
                        {currentCard.source ? `Source: ${currentCard.source}` : "Study Deck"}
                      </span>
                      <span className="flip-hint mono">
                        [Space] Flip · Swipe Right = Good ↷
                      </span>
                    </div>
                  </div>

                  {/* Back Side */}
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
                          Rep #{currentSRS.reps} · Next: {currentSRS.intervalDays}d
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SM-2 Ambient Action Grading Bar (No harsh bottom borders) */}
              <div className="deck-actions srs-action-bar">
                <div className="srs-rating-buttons">
                  <button
                    type="button"
                    className="srs-btn srs-again mono"
                    onClick={() => handleSRSGrade(1)}
                    title="Press 1: Reset interval (1d)"
                  >
                    <span className="srs-lbl">[1] Again</span>
                    <small>1d reset</small>
                  </button>
                  <button
                    type="button"
                    className="srs-btn srs-hard mono"
                    onClick={() => handleSRSGrade(2)}
                    title="Press 2: Struggled recall"
                  >
                    <span className="srs-lbl">[2] Hard</span>
                    <small>3d</small>
                  </button>
                  <button
                    type="button"
                    className="srs-btn srs-good mono"
                    onClick={() => handleSRSGrade(3)}
                    title="Press 3: Solid recall"
                  >
                    <span className="srs-lbl">[3] Good</span>
                    <small>6d</small>
                  </button>
                  <button
                    type="button"
                    className="srs-btn srs-easy mono"
                    onClick={() => handleSRSGrade(4)}
                    title="Press 4: Instant mastery"
                  >
                    <span className="srs-lbl">[4] Easy</span>
                    <small>8d+</small>
                  </button>
                </div>

                <div className="nav-buttons">
                  <button type="button" className="deck-btn mono" onClick={handlePrev}>
                    ← Prev
                  </button>
                  <button type="button" className="deck-btn primary mono" onClick={handleFlip}>
                    {isFlipped ? "Show Question" : "Show Answer"}
                  </button>
                  <button type="button" className="deck-btn mono" onClick={handleNext}>
                    Next →
                  </button>
                </div>
              </div>

              <div className="deck-shortcuts-hint mono">
                <span>[Space] Flip</span>
                <span>[Swipe ↔] Mobile recall</span>
                <span>[1–4] Spaced rating</span>
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
