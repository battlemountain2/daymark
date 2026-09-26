"use client";

import { useState, use } from "react";
import type { StudyHubData, CourseStudyInfo } from "@/lib/study-hub";
import FlashcardDeckViewer from "@/components/FlashcardDeckViewer";
import { longDate } from "@/lib/localtime";

import GradeSimulator from "@/components/GradeSimulator";
type Props = {
  promise: Promise<StudyHubData>;
};

export default function StudyHubPanel({ promise }: Props) {
  const data = use(promise);
  const [activeTab, setActiveTab] = useState<"overview" | "cards" | "review" | "grades">("overview");
  const [selectedCourseForDeck, setSelectedCourseForDeck] = useState<string | null>(null);

  const { courses, weeklyReview, allCards, overallDeckStats } = data;

  const handleOpenCourseDeck = (courseCode: string) => {
    setSelectedCourseForDeck(courseCode);
    setActiveTab("cards");
  };

  const handlePracticeCard = (cardId?: string, courseCode?: string) => {
    if (courseCode) setSelectedCourseForDeck(courseCode);
    setActiveTab("cards");
  };

  return (
    <section className="card span12 study-card">
      <div className="card-head">
        <div className="study-head-left">
          <h2>Academic Study Hub</h2>
          <span className="pill mono term-pill">{data.activeTerm} · Week {data.currentWeekNumber}</span>
        </div>
        <div className="study-tabs mono">
          <button
            type="button"
            className={`study-tab ${activeTab === "overview" ? "on" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            Course Matrix
          </button>
          <button
            type="button"
            className={`study-tab ${activeTab === "cards" ? "on" : ""}`}
            onClick={() => {
              setSelectedCourseForDeck(null);
              setActiveTab("cards");
            }}
          >
            Flashcard Decks ({allCards.length})
          </button>
          <button
            type="button"
            className={`study-tab ${activeTab === "review" ? "on" : ""}`}
            onClick={() => setActiveTab("review")}
          >
            Weekly Review & Takeaways
          </button>
          <button
            type="button"
            className={`study-tab ${activeTab === "grades" ? "on" : ""}`}
            onClick={() => setActiveTab("grades")}
          >
            📊 Grade Simulator
          </button>
        </div>
      </div>

      <div className="card-body study-body">
        {/* TAB 1: COURSE MATRIX & ACTIVE OVERVIEW */}
        {activeTab === "overview" && (
          <div className="study-overview-wrap">
            {/* Top Quick Status Bar */}
            <div className="study-quick-status mono">
              <div className="sq-stat">
                <span className="k">Active Classes:</span>
                <span className="v">{courses.length} courses</span>
              </div>
              <div className="sq-stat">
                <span className="k">Flashcards Prepared:</span>
                <span className="v"><b>{overallDeckStats.verified}</b> / {allCards.length} Verified</span>
              </div>
              <div className="sq-stat">
                <span className="k">Weak Spots Flagged:</span>
                <span className="v flag">{overallDeckStats.needsReview} cards</span>
              </div>
              <div className="sq-stat">
                <span className="k">Weekly Review:</span>
                <span className="v">{weeklyReview.scheduledReviewDate}</span>
              </div>
            </div>

            {/* Course Cards Grid */}
            <div className="course-cards-grid">
              {courses.map((c) => {
                const totalC = c.deckStats.total;
                const verPct = totalC > 0 ? Math.round((c.deckStats.verified / totalC) * 100) : 0;

                return (
                  <div key={c.code} className={`course-card ${c.ck}`}>
                    <div className="course-card-top">
                      <div className="course-badge mono">{c.code}</div>
                      <div className="course-where mono">{c.where}</div>
                    </div>

                    <div className="course-title">{c.name}</div>

                    <div className="course-topic-box">
                      <span className="topic-k mono">Current Topic:</span>
                      <div className="topic-v">{c.currentTopic}</div>
                    </div>

                    {c.resourceStatus && (
                      <div className="course-topic-box">
                        <span className="topic-k mono">Resources: {c.resourceStatus}</span>
                        <div className="topic-v">{c.resourceNote}</div>
                      </div>
                    )}

                    {c.nextAssessment && (
                      <div className="course-next-deadline mono">
                        <span className="d-icon">⏳</span>
                        <span className="d-title">{c.nextAssessment.title}</span>
                        <span className="d-date">{longDate(c.nextAssessment.due).replace(/^\w+,\s*/, "")}</span>
                      </div>
                    )}

                    <div className="course-deck-stats">
                      <div className="deck-stat-topline mono">
                        <span>{totalC} Flashcards</span>
                        <span>{verPct}% Verified</span>
                      </div>
                      <div className="mini-prog-track">
                        <div className="mini-prog-fill" style={{ width: `${verPct}%` }} />
                      </div>
                    </div>

                    <div className="course-card-actions">
                      {c.driveUrl && (
                        <a
                          className="open-deck-btn mono"
                          href={c.driveUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open Drive ↗
                        </a>
                      )}
                      <button
                        type="button"
                        className="open-deck-btn mono"
                        onClick={() => handleOpenCourseDeck(c.code)}
                      >
                        Open Deck ({c.cards.length}) →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Embedded Mini Review Strip */}
            <div className="mini-review-banner">
              <div className="mrb-content">
                <div className="mono mrb-k">🎯 Week {data.currentWeekNumber} Core Focus:</div>
                <div className="mrb-text">
                  Global wind belts &amp; Coriolis deflection (GEOG 1160), Indian Ocean monsoon trade networks (HIST 300), and urban form &amp; transit ecology (GEOG 1150).
                </div>
              </div>
              <button
                type="button"
                className="mono mrb-btn"
                onClick={() => setActiveTab("review")}
              >
                Read 5 Takeaways &rarr;
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: FLASHCARD DECK BROWSER & FLIP VIEWER */}
        {activeTab === "cards" && (
          <FlashcardDeckViewer
            initialCards={allCards}
            courses={courses}
            selectedCourseFilter={selectedCourseForDeck}
          />
        )}

        {/* TAB 3: WEEKLY REVIEW & SYNTHESIS */}
        {activeTab === "review" && (
          <div className="weekly-review-container">
            <div className="wr-header">
              <div>
                <h3 className="wr-title">{weeklyReview.weekTitle}</h3>
                <p className="sub mono">
                  Automated synthesis co-managed with Gemini Spark & ChatGPT · Friday 8:00 PM review cadence
                </p>
              </div>
            </div>

            {/* 5 Core Takeaways */}
            <div className="wr-section">
              <div className="wr-section-head mono">
                <span>✦ The 5 Core Takeaways This Week</span>
              </div>
              <div className="takeaways-list">
                {weeklyReview.takeaways.map((t, idx) => (
                  <div key={idx} className={`takeaway-item ${t.ck}`}>
                    <div className="takeaway-num mono">0{idx + 1}</div>
                    <div className="takeaway-content">
                      <div className="takeaway-meta mono">
                        <span className={`tagdot ${t.ck}`} />
                        <span>{t.course}</span>
                      </div>
                      <div className="takeaway-title">{t.title}</div>
                      <div className="takeaway-detail">{t.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Flagged Weak Areas & Targeted Spaced Repetition */}
            <div className="wr-section" style={{ marginTop: 32 }}>
              <div className="wr-section-head mono">
                <span>⚠️ Flagged Weak Areas & Spaced Review Queue</span>
              </div>
              <div className="weak-areas-grid">
                {weeklyReview.weakAreas.map((w, idx) => (
                  <div key={idx} className={`weak-card ${w.ck}`}>
                    <div className="weak-top mono">
                      <span className="w-course">{w.course}</span>
                      <span className="w-badge">Needs Review</span>
                    </div>
                    <div className="weak-topic">{w.topic}</div>
                    <div className="weak-reason">{w.reason}</div>
                    <button
                      type="button"
                      className="weak-action-btn mono"
                      onClick={() => handlePracticeCard(w.cardId, w.course)}
                    >
                      Practice Flashcards →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function StudyHubSkeleton() {
  return (
    <section className="card span12 study-card">
      <div className="card-head">
        <h2>Academic Study Hub</h2>
        <span className="pill mono">loading</span>
      </div>
      <div className="card-body">
        <div className="course-cards-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="course-card">
              <span className="bar" style={{ width: "40%", height: 20 }} />
              <span className="bar" style={{ width: "80%", height: 16, marginTop: 12 }} />
              <span className="bar" style={{ width: "60%", height: 14, marginTop: 8 }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
