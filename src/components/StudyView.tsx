"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { StudyHubData } from "@/lib/study-hub-types";
import FlashcardDeckViewer from "@/components/FlashcardDeckViewer";
import EvidenceBank from "@/components/EvidenceBank";
import PreClassBriefModal from "@/components/PreClassBriefModal";
import FridayReviewWizard from "@/components/FridayReviewWizard";
import CodingStudyLab from "@/components/CodingStudyLab";
import { getPreClassBrief, type PreClassBrief } from "@/lib/pre-class-briefs";
import { longDate } from "@/lib/localtime";

function LiveClock() {
  const [clock, setClock] = useState<{ date: string; time: string } | null>(null);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock({
        date: d.toLocaleDateString("en-US", {
          timeZone: "America/Denver",
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        time: d.toLocaleTimeString("en-US", {
          timeZone: "America/Denver",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }).toLowerCase(),
      });
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <span>{clock?.date ?? "\u00a0"}</span>
      <span>{clock?.time ?? "\u00a0"}</span>
    </>
  );
}

export default function StudyView({ data, initialMode }: { data: StudyHubData; initialMode?: string }) {
  const [activeTab, setActiveTab] = useState<"cards" | "courses" | "coding" | "review">(
    initialMode === "coding" || initialMode === "python" ? "coding" : "cards"
  );
  const [synthesisView, setSynthesisView] = useState<"takeaways" | "evidence">("takeaways");
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [activeBrief, setActiveBrief] = useState<PreClassBrief | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [palette, setPalette] = useState("forest");

  const { courses, weeklyReview, allCards, overallDeckStats } = data;
  const verifiedPct = allCards.length > 0 ? Math.round((overallDeckStats.verified / allCards.length) * 100) : 0;

  useEffect(() => {
    const p = localStorage.getItem("palette") || localStorage.getItem("hb:pal");
    if (p && ["forest", "dusk", "ash", "sandia", "paper", "yharnam"].includes(p)) {
      if (p === "forest") document.documentElement.removeAttribute("data-palette");
      else document.documentElement.setAttribute("data-palette", p);
      setPalette(p);
    }
  }, []);

  function applyPalette(p: string) {
    setPalette(p);
    if (p === "forest") document.documentElement.removeAttribute("data-palette");
    else document.documentElement.setAttribute("data-palette", p);
    try {
      localStorage.setItem("palette", p);
      localStorage.setItem("hb:pal", p);
    } catch {}
  }

  const handleOpenDeck = (courseCode: string) => {
    setSelectedCourse(courseCode);
    setActiveTab("cards");
  };

  return (
    <div className="wrap study-page-wrap">
      {/* 1. NATIVE DAYMARK HEADER */}
      <header>
        <div className="ledeblock">
          <div className="kicker mono">
            <span className="kdot" aria-hidden="true" style={{ background: "var(--accent)" }} />
            Academic Study Hub
            <span className="kgreet">{data.activeTerm} · Week {data.currentWeekNumber}</span>
          </div>
          <h1 className="lede">Course Mastery &amp; Active Recall</h1>
          <p className="ledesub">
            {courses.length} active courses · {allCards.length} flashcards · {verifiedPct}% verified
          </p>
        </div>

        <div className="stamp mono">
          <Link href="/" className="backlink-inline mono" style={{ textDecoration: "none", color: "var(--accent)", fontWeight: 600 }}>
            ← dashboard
          </Link>
          <LiveClock />
          <span className="themes">
            {["forest", "dusk", "ash", "sandia", "paper", "yharnam"].map((p) => (
              <button
                key={p}
                type="button"
                className="mono"
                aria-pressed={palette === p}
                onClick={() => applyPalette(p)}
              >
                {p}
              </button>
            ))}
          </span>
        </div>
      </header>

      <div className="rule" />

      {/* 2. NATIVE DAYMARK FACTS SUMMARY STRIP */}
      <div className="facts" style={{ margin: "18px 0 24px" }}>
        <div className="fact">
          <div className="k">Courses</div>
          <div className="v">{courses.length}</div>
        </div>
        <div className="fact">
          <div className="k">Active Cards</div>
          <div className="v">{allCards.length}</div>
        </div>
        <div className="fact">
          <div className="k">Mastered</div>
          <div className="v" style={{ color: "var(--good)" }}>{verifiedPct}%</div>
        </div>
        <div className="fact">
          <div className="k">Needs Review</div>
          <div className="v" style={{ color: "var(--heat)" }}>{overallDeckStats.needsReview}</div>
        </div>
        <div className="fact">
          <div className="k">Weekly Synthesis</div>
          <div className="v" style={{ fontSize: 13, marginTop: 5 }}>{weeklyReview.scheduledReviewDate}</div>
        </div>
      </div>

      {/* 3. STREAMLINED 4-TAB NAVIGATION */}
      <div className="card-head" style={{ marginBottom: 18 }}>
        <h2>Study Station</h2>
        <div className="view-toggle mono">
          <button
            type="button"
            className={`view-toggle-btn ${activeTab === "cards" ? "active" : ""}`}
            onClick={() => setActiveTab("cards")}
          >
            ✦ Active Recall ({allCards.length})
          </button>
          <span className="view-toggle-sep">/</span>
          <button
            type="button"
            className={`view-toggle-btn ${activeTab === "courses" ? "active" : ""}`}
            onClick={() => setActiveTab("courses")}
          >
            📚 Courses &amp; Readings
          </button>
          <span className="view-toggle-sep">/</span>
          <button
            type="button"
            className={`view-toggle-btn ${activeTab === "coding" ? "active" : ""}`}
            onClick={() => setActiveTab("coding")}
          >
            🐍 Python &amp; GIS Lab
          </button>
          <span className="view-toggle-sep">/</span>
          <button
            type="button"
            className={`view-toggle-btn ${activeTab === "review" ? "active" : ""}`}
            onClick={() => setActiveTab("review")}
          >
            📝 Weekly Synthesis &amp; Evidence
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="study-page-body">
        {/* TAB 1: FLASHCARDS & RECALL */}
        {activeTab === "cards" && (
          <section className="card span12 study-card">
            <div className="card-body">
              <FlashcardDeckViewer
                initialCards={allCards}
                courses={courses}
                selectedCourseFilter={selectedCourse}
                initialViewMode={initialMode === "quiz" ? ("quiz" as const) : ("study" as const)}
              />
            </div>
          </section>
        )}

        {/* TAB 2: COURSE MATRIX & WEEK 5 READINGS */}
        {activeTab === "courses" && (
          <section className="card span12 study-card">
            <div className="card-head">
              <h2>Active Courses &amp; Week {data.currentWeekNumber} Syllabi</h2>
              <span className="pill mono">{courses.length} courses active</span>
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
                        <span className="topic-k mono">Week {data.currentWeekNumber} Focus:</span>
                        <div className="topic-v">{c.currentTopic}</div>
                      </div>

                      {c.readings && c.readings.length > 0 && (
                        <div className="course-readings-list">
                          <span className="topic-k mono">Assigned Readings &amp; Labs:</span>
                          <ul>
                            {c.readings.map((r, idx) => (
                              <li key={idx} className="mono">{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {c.resourceNote && (
                        <div className="sub mono" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 8 }}>
                          Package: {c.resourceNote}
                        </div>
                      )}

                      <div className="course-deck-stats">
                        <div className="deck-stat-topline mono">
                          <span>{totalC} Flashcards</span>
                          <span>{vPct}% Verified</span>
                        </div>
                        <div className="minimal-prog-track">
                          <div className="minimal-prog-fill" style={{ width: `${vPct}%` }} />
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

        {/* TAB 3: PYTHON & GIS CODING LAB */}
        {activeTab === "coding" && <CodingStudyLab />}

        {/* TAB 4: UNIFIED WEEKLY SYNTHESIS & EVIDENCE */}
        {activeTab === "review" && (
          <section className="card span12 study-card">
            <div className="card-head">
              <h2>{weeklyReview.weekTitle}</h2>
              <div className="view-toggle mono">
                <button
                  type="button"
                  className={`view-toggle-btn ${synthesisView === "takeaways" ? "active" : ""}`}
                  onClick={() => setSynthesisView("takeaways")}
                >
                  ✦ Takeaways &amp; Review
                </button>
                <span className="view-toggle-sep">/</span>
                <button
                  type="button"
                  className={`view-toggle-btn ${synthesisView === "evidence" ? "active" : ""}`}
                  onClick={() => setSynthesisView("evidence")}
                >
                  🏛️ Evidence Bank
                </button>
              </div>
            </div>
            <div className="card-body">
              {synthesisView === "takeaways" ? (
                <>
                  {/* Launch Friday Synthesis Banner */}
                  <div className="friday-wizard-cta-banner">
                    <div className="fwc-text">
                      <h3>Friday 8:00 PM Synthesis Ritual</h3>
                      <p className="sub mono">
                        Guided 5-minute review: absorb the 5 core takeaways across your courses, check your readings, and sprint your weak areas.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="friday-launch-btn mono"
                      onClick={() => setIsWizardOpen(true)}
                    >
                      ⚡ Launch Friday Wizard →
                    </button>
                  </div>

                  <div className="weekly-review-container" style={{ marginTop: 24 }}>
                    <div className="wr-section">
                      <div className="wr-section-head mono">
                        <span>✦ The 5 Core Takeaways (Fall 2026 Week {data.currentWeekNumber})</span>
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
                        <span>⚠️ Flagged Focus Areas &amp; Spaced Review</span>
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
                </>
              ) : (
                <EvidenceBank />
              )}
            </div>
          </section>
        )}
      </div>

      {/* Pre-Class Brief Modal */}
      <PreClassBriefModal brief={activeBrief} onClose={() => setActiveBrief(null)} />

      {/* Friday Synthesis Wizard */}
      {isWizardOpen && (
        <FridayReviewWizard
          data={weeklyReview}
          onClose={() => setIsWizardOpen(false)}
        />
      )}

      <footer>
        Study Hub cards are parsed from standardized Anki CSVs with SM-2 spaced repetition, Python &amp; GIS coding lab, and Friday synthesis rituals.
        All times in Mountain Time.
      </footer>
    </div>
  );
}
