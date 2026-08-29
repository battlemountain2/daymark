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
  const [viewMode, setViewMode] = useState<"study" | "browse">("study");
  
  // SM-2 Spaced Repetition & Session Tracking
  const [srsStore, setSrsStore] = useState<SRSStore>({});
  const [sessionStreak, setSessionStreak] = useState<number>(0);
  const [sessionReviewed, setSessionReviewed] = useState<number>(0);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (currentIndex >= filteredCards.length && filteredCards.length > 0) {
      setCurrentIndex(0);
      setIsFlipped(false);
    }
  }, [filteredCards.length, currentIndex]);

  const handleNext = () => {
    if (filteredCards.length === 0) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % filteredCards.length);
  };

  const handlePrev = () => {
    if (filteredCards.length === 0) return;
    setIsFlipped(false);
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

    // Update status in card list
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

    // Auto advance to next card
    handleNext();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "SELECT") return;

      if (e.code === "Space") {
        e.preventDefault();
        handleFlip();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "1" && currentCard) {
        handleSRSGrade(1);
      } else if (e.key === "2" && currentCard) {
        handleSRSGrade(2);
      } else if (e.key === "3" && currentCard) {
        handleSRSGrade(3);
      } else if (e.key === "4" && currentCard) {
        handleSRSGrade(4);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentCard, filteredCards.length, isFlipped]);

  // Drag and Drop CSV Importer
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
  const draftCount = filteredCards.filter((c) => c.status === "Draft").length;
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
          <span className="sub">Session Reviewed:</span> <b>{sessionReviewed}</b>
        </div>
        <div className="ssr-item">
          <span className="sub">Current Streak:</span> <b>🔥 {sessionStreak}</b>
        </div>
        <div className="ssr-item">
          <span className="sub">Deck Progress:</span> <b>{progressPct}% Verified</b>
        </div>
        <div className="ssr-item file-drop-cta" onClick={() => fileInputRef.current?.click()}>
          <span className="sub">📥 Drop CSV here or Click to Import</span>
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

      {/* Header controls & Filters */}
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

        <div className="deck-mode-toggle">
          <button
            type="button"
            className={`mono sm-btn ${viewMode === "study" ? "on" : ""}`}
            onClick={() => setViewMode("study")}
          >
            Study Flip Mode
          </button>
          <button
            type="button"
            className={`mono sm-btn ${viewMode === "browse" ? "on" : ""}`}
            onClick={() => setViewMode("browse")}
          >
            Browse Table
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="deck-toolbar">
        <div className="deck-search-wrap">
          <input
            type="text"
            className="deck-search-input mono"
            placeholder="Search concepts, questions, or tags..."
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

      {/* Progress & Stats Bar */}
      <div className="deck-stats-bar">
        <div className="deck-progress-track">
          <div
            className="deck-progress-fill verified"
            style={{ width: `${progressPct}%` }}
            title={`${verifiedCount} Verified (${progressPct}%)`}
          />
          <div
            className="deck-progress-fill review"
            style={{
              width: `${total > 0 ? (needsReviewCount / total) * 100 : 0}%`,
            }}
            title={`${needsReviewCount} Needs Review`}
          />
        </div>
        <div className="deck-stats-labels mono">
          <span className="stat-v"><b>{verifiedCount}</b> Verified ({progressPct}%)</span>
          <span className="stat-r"><b>{needsReviewCount}</b> Needs Review</span>
          <span className="stat-d"><b>{draftCount}</b> Draft</span>
          <span className="stat-tot">{total} Total Cards</span>
        </div>
      </div>

      {/* Main Content: Flip Card or Browse Table */}
      {viewMode === "study" ? (
        <div className="deck-study-area">
          {filteredCards.length === 0 ? (
            <div className="deck-empty mono">
              No flashcards match the current filter.
            </div>
          ) : currentCard ? (
            <>
              <div
                className={`flashcard-scene ${isFlipped ? "flipped" : ""}`}
                onClick={handleFlip}
                role="button"
                tabIndex={0}
                aria-label={`Flashcard ${currentIndex + 1} of ${total}. Click or press space to flip.`}
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
                        [Space] Flip to Answer ↷
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

              {/* SM-2 Rating & Action Bar */}
              <div className="deck-actions srs-action-bar">
                <div className="srs-rating-buttons">
                  <button
                    type="button"
                    className="srs-btn srs-again mono"
                    onClick={() => handleSRSGrade(1)}
                    title="Press 1: Reset interval (Tomorrow)"
                  >
                    [1] Again <small>1d</small>
                  </button>
                  <button
                    type="button"
                    className="srs-btn srs-hard mono"
                    onClick={() => handleSRSGrade(2)}
                    title="Press 2: Struggled recall"
                  >
                    [2] Hard <small>3d</small>
                  </button>
                  <button
                    type="button"
                    className="srs-btn srs-good mono"
                    onClick={() => handleSRSGrade(3)}
                    title="Press 3: Solid recall"
                  >
                    [3] Good <small>6d</small>
                  </button>
                  <button
                    type="button"
                    className="srs-btn srs-easy mono"
                    onClick={() => handleSRSGrade(4)}
                    title="Press 4: Instant mastery"
                  >
                    [4] Easy <small>8d+</small>
                  </button>
                </div>

                <div className="nav-buttons">
                  <button
                    type="button"
                    className="deck-btn mono"
                    onClick={handlePrev}
                    title="Previous Card (Left Arrow)"
                  >
                    ← Prev
                  </button>
                  <button
                    type="button"
                    className="deck-btn primary mono"
                    onClick={handleFlip}
                    title="Flip Card (Space)"
                  >
                    {isFlipped ? "Show Question" : "Show Answer"}
                  </button>
                  <button
                    type="button"
                    className="deck-btn mono"
                    onClick={handleNext}
                    title="Next Card (Right Arrow)"
                  >
                    Next →
                  </button>
                </div>
              </div>

              <div className="deck-shortcuts-hint mono">
                <span>[Space] Flip</span>
                <span>[← / →] Prev/Next</span>
                <span>[1] Again</span>
                <span>[2] Hard</span>
                <span>[3] Good</span>
                <span>[4] Easy</span>
              </div>
            </>
          ) : null}
        </div>
      ) : (
        /* Browse Table View */
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
