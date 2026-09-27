"use client";
import { cloudStorage } from "@/lib/cloud-storage";


import { useEffect, useMemo, useState, useRef } from "react";
import { useCloudRevision } from "@/lib/use-cloud-revision";
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
  initialViewMode?: "study" | "quiz" | "exam" | "browse";
};

type QuizChoice = {
  text: string;
  isCorrect: boolean;
};

type TutorExplanation = {
  intuition: string;
  mnemonic: string;
  localAnchor: string;
  provider: string;
};

type ExamQuestion = {
  id: string;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  concept: string;
};

type SortMode = "default" | "shuffle" | "needsReview" | "unverified";

export default function FlashcardDeckViewer({
  initialCards,
  courses,
  selectedCourseFilter = null,
  initialViewMode = "study",
}: Props) {
  const [cards, setCards] = useState<Flashcard[]>(initialCards);
  const [activeCourse, setActiveCourse] = useState<string>(selectedCourseFilter || "ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"study" | "quiz" | "exam" | "browse">(initialViewMode);
  const [tutorExplanation, setTutorExplanation] = useState<TutorExplanation | null>(null);
  const [isTutorLoading, setIsTutorLoading] = useState<boolean>(false);
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [examAnswers, setExamAnswers] = useState<Record<number, number>>({});
  const [isExamLoading, setIsExamLoading] = useState<boolean>(false);
  const [isExamSubmitted, setIsExamSubmitted] = useState<boolean>(false);

  // SM-2 Spaced Repetition & Session Tracking
  const [srsStore, setSrsStore] = useState<SRSStore>({});
  const cloudRevision = useCloudRevision();
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
  const [quizStreak, setQuizStreak] = useState<number>(0);
  const [quizAnsweredCount, setQuizAnsweredCount] = useState<number>(0);
  const [quizCorrectCount, setQuizCorrectCount] = useState<number>(0);
  const [missedCardIds, setMissedCardIds] = useState<string[]>([]);
  const [quizComplete, setQuizComplete] = useState<boolean>(false);
  const [randomSeed, setRandomSeed] = useState<number>(0);

  useEffect(() => {
    setSrsStore(loadSRSStore());
  }, [cloudRevision]);

  useEffect(() => {
    const loadCustom = () => {
      try {
        const stored = cloudStorage.getItem("hb:custom-anki-cards");
        const custom: Flashcard[] = stored ? JSON.parse(stored) : [];
        const base = [...initialCards];
        const existingIds = new Set(base.map(c => c.id));
        const combined = [...base, ...custom.filter(c => !existingIds.has(c.id))];
        setCards(combined);
      } catch {
        setCards(initialCards);
      }
    };
    loadCustom();
    window.addEventListener("custom-anki-updated", loadCustom);
    return () => window.removeEventListener("custom-anki-updated", loadCustom);
  }, [initialCards]);

  useEffect(() => {
    if (selectedCourseFilter) {
      setActiveCourse(selectedCourseFilter);
      setCurrentIndex(0);
      setIsFlipped(false);
    }
  }, [selectedCourseFilter]);

  // Card count per course for the quick filter chips
  const courseCardCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of cards) {
      const code = c.courseCode.toUpperCase();
      counts[code] = (counts[code] || 0) + 1;
    }
    return counts;
  }, [cards]);

  // Filtered & Sorted Card List
  const filteredCards = useMemo(() => {
    const base = cards.filter((card) => {
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

    // Apply Sorting
    const sorted = [...base];
    if (sortMode === "shuffle" || viewMode === "quiz") {
      // Deterministic shuffle with randomSeed
      sorted.sort(() => Math.sin(randomSeed + 1) - 0.5);
    } else if (sortMode === "needsReview") {
      sorted.sort((a, b) => {
        if (a.status === "Needs review" && b.status !== "Needs review") return -1;
        if (b.status === "Needs review" && a.status !== "Needs review") return 1;
        return 0;
      });
    } else if (sortMode === "unverified") {
      sorted.sort((a, b) => {
        if (a.status !== "Verified" && b.status === "Verified") return -1;
        if (b.status !== "Verified" && a.status === "Verified") return 1;
        return 0;
      });
    }
    return sorted;
  }, [cards, activeCourse, statusFilter, searchQuery, sortMode, viewMode, randomSeed]);

  const currentCard: Flashcard | undefined = filteredCards[currentIndex];
  const currentSRS = currentCard ? (srsStore[currentCard.id] || INITIAL_SRS_STATE(currentCard.id)) : null;

  // Intelligent In-Subject Distractor Engine for Kahoot Quiz
  useEffect(() => {
    if (viewMode !== "quiz" || !currentCard) return;

    setSelectedChoiceIdx(null);
    setQuizTimer(20);

    // 1. Gather other answers from the SAME course first for high conceptual rigor
    const sameCourseOtherAnswers = cards
      .filter((c) => c.id !== currentCard.id && c.courseCode === currentCard.courseCode && c.back.trim() !== currentCard.back.trim())
      .map((c) => c.back);

    let distractors: string[] = [];
    if (sameCourseOtherAnswers.length >= 3) {
      // Pick 3 from the same course
      const shuffled = [...sameCourseOtherAnswers].sort(() => Math.random() - 0.5);
      distractors = shuffled.slice(0, 3);
    } else {
      // Pad with cross-course answers if deck is small
      const crossCourseAnswers = cards
        .filter((c) => c.id !== currentCard.id && c.courseCode !== currentCard.courseCode && c.back.trim() !== currentCard.back.trim())
        .map((c) => c.back);
      const needed = 3 - sameCourseOtherAnswers.length;
      const shuffledCross = [...crossCourseAnswers].sort(() => Math.random() - 0.5).slice(0, needed);
      distractors = [...sameCourseOtherAnswers, ...shuffledCross].sort(() => Math.random() - 0.5);
    }

    const choices: QuizChoice[] = [
      { text: currentCard.back, isCorrect: true },
      ...distractors.map((t) => ({ text: t, isCorrect: false })),
    ].sort(() => Math.random() - 0.5);

    setQuizChoices(choices);
  }, [currentIndex, viewMode, currentCard, cards]);

  // Quiz timer countdown
  useEffect(() => {
    if (viewMode !== "quiz" || selectedChoiceIdx !== null || quizComplete) return;
    const interval = setInterval(() => {
      setQuizTimer((t) => {
        if (t <= 1) {
          handleQuizSelect(-1); // Time out
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [viewMode, selectedChoiceIdx, currentIndex, quizComplete]);

  const handleShuffleDeck = () => {
    setRandomSeed(Date.now());
    setSortMode("shuffle");
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleNext = () => {
    if (filteredCards.length === 0) return;
    setIsFlipped(false);
    setSelectedChoiceIdx(null);
    setSwipeOffset(0);

    if (viewMode === "quiz" && currentIndex + 1 >= Math.min(10, filteredCards.length)) {
      setQuizComplete(true);
      return;
    }

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
    setQuizAnsweredCount((c) => c + 1);

    const isCorrect = choiceIdx >= 0 && quizChoices[choiceIdx]?.isCorrect;
    if (isCorrect) {
      const streakBonus = quizStreak * 25;
      const speedBonus = quizTimer * 5;
      setQuizScore((s) => s + 100 + speedBonus + streakBonus);
      setQuizStreak((st) => st + 1);
      setQuizCorrectCount((cc) => cc + 1);

      if (currentCard) {
        const prevSRS = srsStore[currentCard.id] || INITIAL_SRS_STATE(currentCard.id);
        const updated = calculateNextSRS(prevSRS, 3);
        setSrsStore(saveSRSCard(updated));
      }
    } else {
      setQuizStreak(0);
      if (currentCard) {
        setMissedCardIds((prev) => [...prev, currentCard.id]);
        const prevSRS = srsStore[currentCard.id] || INITIAL_SRS_STATE(currentCard.id);
        const updated = calculateNextSRS(prevSRS, 1);
        setSrsStore(saveSRSCard(updated));
      }
    }

    setTimeout(() => {
      handleNext();
    }, 1400);
  };

  const handleRestartQuiz = () => {
    setRandomSeed(Date.now());
    setCurrentIndex(0);
    setQuizScore(0);
    setQuizStreak(0);
    setQuizAnsweredCount(0);
    setQuizCorrectCount(0);
    setMissedCardIds([]);
    setQuizComplete(false);
    setSelectedChoiceIdx(null);
  };

  const handleReviewMissedCards = () => {
    if (missedCardIds.length === 0) return;
    setCards((prev) => prev.filter((c) => missedCardIds.includes(c.id)));
    setViewMode("study");
    setCurrentIndex(0);
    setIsFlipped(false);
    setQuizComplete(false);
  };

  useEffect(() => {
    setTutorExplanation(null);
  }, [currentIndex]);

  const handleTriggerTutor = async () => {
    if (!currentCard || isTutorLoading) return;
    setIsTutorLoading(true);
    try {
      const res = await fetch("/api/study-hub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "socratic_tutor",
          front: currentCard.front,
          back: currentCard.back,
          courseCode: currentCard.courseCode,
          topic: currentCard.parsedTag?.topic,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTutorExplanation(data.explanation || null);
      }
    } catch (e) {
      console.warn("Tutor fetch error", e);
    } finally {
      setIsTutorLoading(false);
    }
  };

  const handleGenerateExam = async () => {
    setIsExamLoading(true);
    setIsExamSubmitted(false);
    setExamAnswers({});
    const course = activeCourse === "ALL" ? "GEOG 1160" : activeCourse;
    try {
      const res = await fetch("/api/study-hub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_exam",
          courseCode: course,
          count: 5,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setExamQuestions(data.questions || []);
      }
    } catch (e) {
      console.warn("Exam generation error", e);
    } finally {
      setIsExamLoading(false);
    }
  };

  const handleSelectExamChoice = (qIdx: number, choiceIdx: number) => {
    if (isExamSubmitted) return;
    setExamAnswers((prev) => ({ ...prev, [qIdx]: choiceIdx }));
  };

  const handleSubmitExam = () => {
    setIsExamSubmitted(true);
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
      } else if (viewMode === "quiz" && !quizComplete) {
        if (["1", "2", "3", "4"].includes(e.key)) {
          const cIdx = parseInt(e.key, 10) - 1;
          if (cIdx < quizChoices.length) handleQuizSelect(cIdx);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentCard, filteredCards.length, isFlipped, viewMode, quizChoices, quizComplete]);

  const total = filteredCards.length;
  const verifiedCount = filteredCards.filter((c) => c.status === "Verified").length;
  const progressPct = total > 0 ? Math.round((verifiedCount / total) * 100) : 0;

  // Distinct course keys helper for chip dots
  const getCourseColorKey = (code: string) => {
    const uc = code.toUpperCase();
    if (uc.includes("GEOG")) return "geo";
    if (uc.includes("POLS")) return "pol";
    if (uc.includes("HIST")) return "his";
    if (uc.includes("PHED") || uc.includes("FIT")) return "fit";
    return "adm";
  };

  return (
    <div className="deck-viewer zen-mode built-in">
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

      {/* UNIFIED STREAMLINED DECK TOOLBAR */}
      <div className="unified-deck-bar">
        {/* Tier 1: Course Decks & Study Modes */}
        <div className="udb-top-row">
          <div className="udb-course-chips mono">
            <button
              type="button"
              className={`cf-pill ${activeCourse === "ALL" ? "active" : ""}`}
              onClick={() => {
                setActiveCourse("ALL");
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
            >
              All Decks
              <span className="cf-count">{cards.length}</span>
            </button>

            {courses.map((c) => {
              const count = courseCardCounts[c.code.toUpperCase()] || c.cards.length;
              const ck = c.ck || getCourseColorKey(c.code);

              return (
                <button
                  key={c.code}
                  type="button"
                  className={`cf-pill ${activeCourse === c.code ? "active" : ""}`}
                  onClick={() => {
                    setActiveCourse(c.code);
                    setCurrentIndex(0);
                    setIsFlipped(false);
                  }}
                >
                  <span className={`tagdot ${ck}`} />
                  {c.code}
                  <span className="cf-count">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="view-toggle mono udb-mode-toggle">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === "study" ? "active" : ""}`}
              onClick={() => {
                setViewMode("study");
                setQuizComplete(false);
              }}
            >
              ✦ Flashcard Flip
            </button>
            <span className="view-toggle-sep">/</span>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === "quiz" ? "active" : ""}`}
              onClick={() => {
                setViewMode("quiz");
                handleRestartQuiz();
              }}
            >
              ⚡ Rapid Quiz
            </button>
            <span className="view-toggle-sep">/</span>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === "browse" ? "active" : ""}`}
              onClick={() => {
                setViewMode("browse");
                setQuizComplete(false);
              }}
            >
              📋 All ({filteredCards.length})
            </button>
            <span className="view-toggle-sep">/</span>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === "exam" ? "active" : ""}`}
              onClick={() => {
                setViewMode("exam");
                setQuizComplete(false);
                if (examQuestions.length === 0) {
                  handleGenerateExam();
                }
              }}
            >
              📝 Midterm Exam
            </button>
          </div>
        </div>

        {/* Tier 2: Search, Sort, Filters, Streak & Mastery */}
        <div className="udb-bottom-row mono">
          <div className="udb-left-controls">
            <button
              type="button"
              className={`cf-tool-btn ${showSearch ? "active" : ""}`}
              onClick={() => setShowSearch(!showSearch)}
            >
              🔍 {showSearch ? "Close Search" : "Search"}
            </button>

            <select
              className="cf-tool-select"
              value={sortMode}
              onChange={(e) => {
                setSortMode(e.target.value as SortMode);
                setCurrentIndex(0);
              }}
            >
              <option value="default">Sort: Default (By Week)</option>
              <option value="shuffle">Sort: 🔀 Shuffled</option>
              <option value="needsReview">Sort: ⚠️ Needs Review First</option>
              <option value="unverified">Sort: 🎯 Unverified First</option>
            </select>

            <select
              className="cf-tool-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentIndex(0);
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="Verified">Verified Only</option>
              <option value="Needs review">Needs Review</option>
              <option value="Draft">Draft Only</option>
            </select>

            <button
              type="button"
              className="cf-tool-btn"
              onClick={handleShuffleDeck}
              title="Shuffle card order"
            >
              🔀 Shuffle
            </button>

            <button
              type="button"
              className="cf-tool-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Import Anki CSV"
            >
              📥 Import CSV
            </button>
          </div>

          <div className="udb-right-metrics">
            {sessionStreak > 0 && (
              <span className="zen-streak-pill" title="Current session streak">
                🔥 {sessionStreak} Streak
              </span>
            )}
            <span className="zen-mastery-pill">
              <span className="live-dot" /> {progressPct}% Mastered ({verifiedCount}/{total})
            </span>
          </div>
        </div>

        {/* Expandable Search Input */}
        {showSearch && (
          <div className="udb-search-expand">
            <input
              type="text"
              className="udb-search-input mono"
              placeholder="Search concepts, terms, question prompts, or tags..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentIndex(0);
              }}
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                className="udb-search-clear mono"
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* MODE 1: 3D FLIP WITH DYNAMIC ANSWER CONTROLS */}
      {viewMode === "study" && (
        <div className="deck-study-area zen-study-area">
          {filteredCards.length === 0 ? (
            <div className="deck-empty mono">No flashcards match the selected class or filters.</div>
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
                  <div className="flashcard-face flashcard-front" aria-hidden={isFlipped}>
                    <div className="card-topline">
                      <span className="course-chip mono">
                        <span className={`tagdot ${getCourseColorKey(currentCard.courseCode)}`} />
                        {currentCard.courseCode}
                      </span>
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
                        {currentCard.source ? `Source: ${currentCard.source}` : "Active Reading"}
                      </span>
                      <span className="flip-hint mono">
                        [Space] Reveal Answer ↷
                      </span>
                    </div>
                  </div>

                  {/* Back Side (Answer) */}
                  <div className="flashcard-face flashcard-back" aria-hidden={!isFlipped}>
                    <div className="card-topline">
                      <span className="course-chip mono">
                        <span className={`tagdot ${getCourseColorKey(currentCard.courseCode)}`} />
                        {currentCard.courseCode} · Answer
                      </span>
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
                          Rep #{currentSRS.reps} · {currentSRS.intervalDays}d interval
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* DYNAMIC ACTION BAR */}
              <div className="zen-action-bar">
                {!isFlipped ? (
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

              {/* Socratic Tutor Section */}
              <div className="socratic-tutor-container">
                <button
                  type="button"
                  className="socratic-tutor-btn mono"
                  onClick={handleTriggerTutor}
                  disabled={isTutorLoading}
                >
                  {isTutorLoading ? "⚡ Analyzing with Copilot..." : "💡 Socratic Tutor: Plain-English & Mnemonic"}
                </button>

                {tutorExplanation && (
                  <div className="socratic-tutor-card mono">
                    <div className="stc-head">
                      <span>💡 Socratic Copilot ({tutorExplanation.provider})</span>
                      <button
                        type="button"
                        style={{ background: "none", border: "none", color: "var(--ink-3)", cursor: "pointer" }}
                        onClick={() => setTutorExplanation(null)}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="stc-section">
                      <strong>🧠 Plain-English Intuition:</strong>
                      <p>{tutorExplanation.intuition}</p>
                    </div>
                    <div className="stc-section">
                      <strong>⚡ Memory Mnemonic:</strong>
                      <p>{tutorExplanation.mnemonic}</p>
                    </div>
                    <div className="stc-section">
                      <strong>📍 New Mexico / Albuquerque Anchor:</strong>
                      <p>{tutorExplanation.localAnchor}</p>
                    </div>
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

      {/* MODE 2: ENHANCED KAHOOT-STYLE QUIZ SPRINT */}
      {viewMode === "quiz" && (
        <div className="quiz-sprint-container">
          {quizComplete ? (
            /* End-of-Sprint Scorecard */
            <div className="quiz-card-box quiz-scorecard">
              <div className="qsc-header mono">
                <span className="pill mono live">🏆 Sprint Finished</span>
                <span className="qsc-score-badge">{quizScore} PTS</span>
              </div>
              <div className="qsc-body">
                <div className="qsc-trophy">⚡</div>
                <h2>Sprint Completed!</h2>
                <p className="sub mono">
                  Accuracy: <b>{quizCorrectCount}</b> of <b>{quizAnsweredCount}</b> correct ({quizAnsweredCount > 0 ? Math.round((quizCorrectCount / quizAnsweredCount) * 100) : 0}%)
                </p>

                {missedCardIds.length > 0 && (
                  <div className="qsc-missed-alert mono">
                    <span>⚠️ {missedCardIds.length} cards flagged for spaced repetition review</span>
                  </div>
                )}

                <div className="qsc-actions mono">
                  {missedCardIds.length > 0 && (
                    <button
                      type="button"
                      className="qsc-btn review-missed"
                      onClick={handleReviewMissedCards}
                    >
                      ✦ Review Missed Cards ({missedCardIds.length}) →
                    </button>
                  )}
                  <button
                    type="button"
                    className="qsc-btn restart"
                    onClick={handleRestartQuiz}
                  >
                    🔀 Start New Shuffled Sprint
                  </button>
                </div>
              </div>
            </div>
          ) : currentCard ? (
            <div className="quiz-card-box">
              {/* Header with Course Tag, Timer, and Live Streak Multiplier */}
              <div className="qc-header mono">
                <div className="qc-left">
                  <span className="course-chip">
                    <span className={`tagdot ${getCourseColorKey(currentCard.courseCode)}`} />
                    {currentCard.courseCode}
                  </span>
                  <span className="sub">Q {currentIndex + 1} of {Math.min(10, total)}</span>
                  {quizStreak > 1 && (
                    <span className="qc-streak-badge">
                      🔥 {quizStreak}x STREAK (+{quizStreak * 25}pts)
                    </span>
                  )}
                </div>
                <div className="qc-right">
                  <span className="qc-score mono">{quizScore} pts</span>
                  <div className="qc-timer">
                    <span className={`qc-clock ${quizTimer <= 5 ? "urgent" : ""}`}>
                      ⏳ {quizTimer}s
                    </span>
                  </div>
                </div>
              </div>

              {/* Question Text */}
              <div className="qc-question-box">
                <p className="qc-question-text">{currentCard.front}</p>
              </div>

              {/* 4 High-Contrast Geometric Kahoot Choice Blocks */}
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
                  const shapeNames = ["Red Triangle", "Blue Diamond", "Gold Circle", "Green Square"];

                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`qc-choice-btn choice-${idx} ${stateClass}`}
                      onClick={() => handleQuizSelect(idx)}
                      disabled={isAnswered}
                      aria-label={`${shapeNames[idx]}: ${choice.text}`}
                    >
                      <span className="qcb-icon mono">{icons[idx]}</span>
                      <span className="qcb-text">{choice.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Context / Explanation Reveal after Answer */}
              {selectedChoiceIdx !== null && (
                <div className="qc-explanation-reveal mono">
                  <span className="qc-exp-source">
                    📖 Source: {currentCard.source || currentCard.courseCode}
                  </span>
                  <span className="qc-exp-next">Advancing in 1.4s...</span>
                </div>
              )}

              <div className="qc-footer mono">
                <span>[Keys 1–4] Instant pick</span>
                <button type="button" className="deck-btn sm-btn" onClick={handleNext}>
                  Skip Question →
                </button>
              </div>
            </div>
          ) : (
            <div className="deck-empty mono">No cards available for quiz.</div>
          )}
        </div>
      )}

      {/* MODE 4: MIDTERM PRACTICE EXAM SIMULATOR */}
      {viewMode === "exam" && (
        <div className="midterm-exam-container mono">
          <div className="exam-hero-card">
            <span className="pill mono live">📝 Midterm Simulator</span>
            <h2 style={{ margin: 0, fontSize: 18 }}>
              {activeCourse === "ALL" ? "GEOG 1160" : activeCourse} Practice Exam
            </h2>
            <p className="sub mono" style={{ maxWidth: 500, margin: 0 }}>
              Synthesized from UNM Fall 2026 course cribs, regional geography/history theses, and active midterm objectives.
            </p>
            <button
              type="button"
              className="deck-btn primary sm-btn"
              onClick={handleGenerateExam}
              disabled={isExamLoading}
            >
              {isExamLoading ? "⚡ Generating Exam via AI..." : "🔄 Generate Fresh Exam"}
            </button>
          </div>

          {isExamSubmitted && (
            <div className="exam-score-banner">
              <span style={{ fontSize: 24 }}>🏆</span>
              <h3 style={{ margin: 0 }}>
                Score:{" "}
                {
                  examQuestions.filter((q, idx) => examAnswers[idx] === q.correctIndex)
                    .length
                }{" "}
                / {examQuestions.length} Correct (
                {Math.round(
                  (examQuestions.filter((q, idx) => examAnswers[idx] === q.correctIndex)
                    .length /
                    Math.max(1, examQuestions.length)) *
                    100
                )}
                %)
              </h3>
              <p className="sub mono" style={{ margin: 0 }}>
                Review detailed explanations and distractor analyses below.
              </p>
            </div>
          )}

          {examQuestions.map((q, qIdx) => {
            const selected = examAnswers[qIdx];
            return (
              <div key={q.id} className="exam-q-card">
                <div className="exam-q-head">
                  <span className="mono" style={{ fontSize: 12, opacity: 0.7 }}>
                    Question {qIdx + 1} of {examQuestions.length}
                  </span>
                  <span className="exam-q-concept mono">{q.concept}</span>
                </div>
                <div className="exam-q-text">{q.question}</div>
                <div className="exam-choices-list">
                  {q.choices.map((choice, cIdx) => {
                    let btnClass = "exam-choice-btn";
                    if (selected === cIdx) btnClass += " selected";
                    if (isExamSubmitted) {
                      if (cIdx === q.correctIndex) btnClass += " correct";
                      else if (selected === cIdx) btnClass += " wrong";
                    }
                    return (
                      <button
                        key={cIdx}
                        type="button"
                        className={btnClass}
                        onClick={() => handleSelectExamChoice(qIdx, cIdx)}
                        disabled={isExamSubmitted}
                      >
                        <span className="choice-letter mono">
                          {["A", "B", "C", "D"][cIdx]}.
                        </span>
                        <span>{choice}</span>
                      </button>
                    );
                  })}
                </div>
                {isExamSubmitted && (
                  <div className="exam-explanation-box">
                    <strong>💡 Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            );
          })}

          {examQuestions.length > 0 && !isExamSubmitted && (
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button
                type="button"
                className="deck-btn primary"
                style={{ padding: "10px 24px", fontSize: 13 }}
                onClick={handleSubmitExam}
                disabled={Object.keys(examAnswers).length === 0}
              >
                🏁 Submit & Grade Exam ({Object.keys(examAnswers).length}/{examQuestions.length} answered)
              </button>
            </div>
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
                  <td className="mono">
                    <span className={`tagdot ${getCourseColorKey(c.courseCode)}`} style={{ marginRight: 6 }} />
                    {c.courseCode}
                  </td>
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
