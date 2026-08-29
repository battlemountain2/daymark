"use client";

import Link from "next/link";
import { useState } from "react";
import type { StudyHubData } from "@/lib/study-hub-types";
import FlashcardDeckViewer from "@/components/FlashcardDeckViewer";
import EvidenceBank from "@/components/EvidenceBank";
import FocusTimer from "@/components/FocusTimer";
import PreClassBriefModal from "@/components/PreClassBriefModal";
import { getPreClassBrief, type PreClassBrief } from "@/lib/pre-class-briefs";
import { longDate } from "@/lib/localtime";

export default function StudyView({ data }: { data: StudyHubData }) {
  const [activeTab, setActiveTab] = useState<"cards" | "courses" | "review" | "evidence" | "focus">("cards");
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [activeBrief, setActiveBrief] = useState<PreClassBrief | null>(null);

  const { courses, weeklyReview, allCards, overallDeckStats } = data;
  const verifiedPct = allCards.length > 0 ? Math.round((overallDeckStats.verified / allCards.length) * 100) : 0;

  const handleOpenDeck = (courseCode: string) => {
    setSelectedCourse(courseCode);
    setActiveTab("cards");
  };

  return (
    <div className="wrap study-page-wrap">
      {/* Header & Backlink */}
      <div className="study-hero">
        <div className="study-hero-top">
          <Link href="/" className="backlink mono">
            ← dashboard
          </Link>
          <span className="pill mono live">
            {data.activeTerm} · Week {data.currentWeekNumber}
          </span>
        </div>

        <div className="study-hero-content">
          <h1 className="study-main-title">Academic Study Hub</h1>
          <p className="sub mono">
            Active recall flashcards, SM-2 spaced repetition, citation bank &amp; focus station
          </p>
        </div>

        {/* Global Stats Ribbon */}
        <div className="study-stats-ribbon mono">
          <div className="ssr-stat">
            <span className="ssr-k">Active Courses</span>
            <span className="ssr-v">{courses.length}</span>
          </div>
          <div className="ssr-stat">
            <span className="ssr-k">Total Flashcards</span>
            <span className="ssr-v">{allCards.length}</span>
          </div>
          <div className="ssr-stat">
            <span className="ssr-k">Verified Rate</span>
            <span className="ssr-v" style={{ color: "var(--good)" }}>{verifiedPct}%</span>
          </div>
          <div className="ssr-stat">
            <span className="ssr-k">Needs Review</span>
            <span className="ssr-v" style={{ color: "var(--heat)" }}>{overallDeckStats.needsReview}</span>
          </div>
          <div className="ssr-stat">
            <span className="ssr-k">Weekly Review</span>
            <span className="ssr-v">{weeklyReview.scheduledReviewDate}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="study-view-tabs mono">
          <button
            type="button"
            className={`sv-tab ${activeTab === "cards" ? "on" : ""}`}
            onClick={() => setActiveTab("cards")}
          >
            ✦ Active Recall ({allCards.length})
          </button>
          <button
            type="button"
            className={`sv-tab ${activeTab === "courses" ? "on" : ""}`}
            onClick={() => setActiveTab("courses")}
          >
            Course Matrix &amp; Syllabi
          </button>
          <button
            type="button"
            className={`sv-tab ${activeTab === "review" ? "on" : ""}`}
            onClick={() => setActiveTab("review")}
          >
            Weekly Review &amp; Takeaways
          </button>
          <button
            type="button"
            className={`sv-tab ${activeTab === "evidence" ? "on" : ""}`}
            onClick={() => setActiveTab("evidence")}
          >
            📖 Evidence Bank
          </button>
          <button
            type="button"
            className={`sv-tab ${activeTab === "focus" ? "on" : ""}`}
            onClick={() => setActiveTab("focus")}
          >
            ⏱️ Focus &amp; Sounds
          </button>
        </div>
      </div>

      <div className="rule" />

      {/* Main Tab Content */}
      <div className="study-page-body">
        {/* TAB 1: FLASHCARDS (DEFAULT) */}
        {activeTab === "cards" && (
          <section className="card span12 study-card">
            <div className="card-body">
              <FlashcardDeckViewer
                initialCards={allCards}
                courses={courses}
                selectedCourseFilter={selectedCourse}
              />
            </div>
          </section>
        )}

        {/* TAB 2: COURSE MATRIX */}
        {activeTab === "courses" && (
          <section className="card span12 study-card">
            <div className="card-head">
              <h2>Active Courses &amp; Syllabi</h2>
              <span className="pill mono">{courses.length} courses enrolled</span>
            </div>
            <div className="card-body">
              <div className="course-cards-grid">
                {courses.map((c) => {
                  const totalC = c.deckStats.total;
                  const vPct = totalC > 0 ? Math.round((c.deckStats.verified / totalC) * 100) : 0;
                  const brief = getPreClassBrief(c.code);

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

                      {c.readings && c.readings.length > 0 && (
                        <div className="course-readings-list">
                          <span className="topic-k mono">Readings &amp; Sources:</span>
                          <ul>
                            {c.readings.map((r, idx) => (
                              <li key={idx} className="mono">{r}</li>
                            ))}
                          </ul>
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
                          <span>{vPct}% Verified</span>
                        </div>
                        <div className="mini-prog-track">
                          <div className="mini-prog-fill" style={{ width: `${vPct}%` }} />
                        </div>
                      </div>

                      <div className="course-card-actions">
                        {brief && (
                          <button
                            type="button"
                            className="brief-open-btn mono"
                            onClick={() => setActiveBrief(brief)}
                          >
                            ⚡ 1-Min Brief
                          </button>
                        )}
                        <button
                          type="button"
                          className="open-deck-btn mono"
                          onClick={() => handleOpenDeck(c.code)}
                        >
                          Study Deck ({c.cards.length}) →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* TAB 3: WEEKLY REVIEW & 5 TAKEAWAYS */}
        {activeTab === "review" && (
          <section className="card span12 study-card">
            <div className="card-head">
              <h2>{weeklyReview.weekTitle}</h2>
              <span className="pill mono">{weeklyReview.scheduledReviewDate}</span>
            </div>
            <div className="card-body">
              <div className="weekly-review-container">
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

                <div className="wr-section" style={{ marginTop: 32 }}>
                  <div className="wr-section-head mono">
                    <span>⚠️ Flagged Weak Areas &amp; Spaced Review Queue</span>
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
                          onClick={() => handleOpenDeck(w.course)}
                        >
                          Practice Flashcards →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 4: EVIDENCE BANK */}
        {activeTab === "evidence" && (
          <section className="card span12 study-card">
            <div className="card-body">
              <EvidenceBank />
            </div>
          </section>
        )}

        {/* TAB 5: FOCUS & SOUNDSCAPES */}
        {activeTab === "focus" && (
          <section className="card span12 study-card">
            <div className="card-body">
              <FocusTimer />
            </div>
          </section>
        )}
      </div>

      {/* Pre-Class Brief Modal */}
      <PreClassBriefModal brief={activeBrief} onClose={() => setActiveBrief(null)} />
    </div>
  );
}
