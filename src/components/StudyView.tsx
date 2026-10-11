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
import PersonalPage from "@/components/PersonalPage";

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

export default function StudyView({ data, initialMode, initialCourse }: { data: StudyHubData; initialMode?: string; initialCourse?:string }) {
  const [activeTab, setActiveTab] = useState<"cards" | "courses" | "coding" | "review">(
    initialMode === "coding" || initialMode === "python" ? "coding" : "cards"
  );
  const [synthesisView, setSynthesisView] = useState<"takeaways" | "evidence">("takeaways");
  const [selectedCourse, setSelectedCourse] = useState<string | null>(data.courses.find(course=>course.code.replace(/\s/g,'').toLowerCase()===initialCourse?.replace(/\s/g,'').toLowerCase())?.code || null);
  const [activeBrief, setActiveBrief] = useState<PreClassBrief | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);


  const { courses, weeklyReview, allCards, overallDeckStats } = data;
  const verifiedPct = allCards.length > 0 ? Math.round((overallDeckStats.verified / allCards.length) * 100) : 0;

  const handleOpenDeck = (courseCode: string) => {
    setSelectedCourse(courseCode);
    setActiveTab("cards");
  };

  return (
    <PersonalPage>
      <div className="desk-topbar"><Link href="/?space=school">← School</Link><span className="mono sub"><LiveClock /></span></div>
      <header className="desk-heading"><div><span className="mono sub">{data.activeTerm} · WEEK {data.currentWeekNumber}</span><h1>Study desk.</h1><p className="sub">Saved study material updated {Number.isFinite(Date.parse(data.lastSynced))?new Date(data.lastSynced).toLocaleDateString('en-US',{timeZone:'America/Denver',month:'short',day:'numeric',year:'numeric'}):'on an unknown date'}. Review results are recorded separately.</p></div><Link href="/?space=school#readings">Open reading desk ↗</Link></header>
      <div className="study-summary"><span><strong>{courses.length}</strong> courses</span><span><strong>{allCards.length}</strong> cards</span><span><strong>{verifiedPct}%</strong> source-verified</span></div>
      <nav className="personal-tabs study-navigation" aria-label="Study sections">{([['cards', 'Practice'], ['courses', 'Courses & readings'], ['coding', 'Python & GIS'], ['review', 'Weekly review']] as const).map(([id, title]) => <button key={id} aria-pressed={activeTab === id} onClick={() => setActiveTab(id)}>{title}</button>)}</nav>
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
              <h2>This week’s courses</h2>
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
                              <li key={idx}>{r}</li>
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
                            Class brief
                          </button>
                        )}
                        <button
                          type="button"
                          className="open-deck-btn mono"
                          onClick={() => handleOpenDeck(c.code)}
                        >
                          Practice {c.cards.length} cards →
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
                  Takeaways
                </button>
                <span className="view-toggle-sep">/</span>
                <button
                  type="button"
                  className={`view-toggle-btn ${synthesisView === "evidence" ? "active" : ""}`}
                  onClick={() => setSynthesisView("evidence")}
                >
                  Evidence & connections
                </button>
              </div>
            </div>
            <div className="card-body">
              {synthesisView === "takeaways" ? (
                <>
                  {/* Launch Friday Synthesis Banner */}
                  <div className="friday-wizard-cta-banner">
                    <div className="fwc-text">
                      <h3>Weekly review</h3>
                    </div>
                    <button
                      type="button"
                      className="friday-launch-btn mono"
                      onClick={() => setIsWizardOpen(true)}
                    >
                      Begin weekly review →
                    </button>
                  </div>

                  <div className="weekly-review-container" style={{ marginTop: 24 }}>
                    <div className="wr-section">
                      <div className="wr-section-head mono">
                        <span>Week {data.currentWeekNumber} takeaways</span>
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
                        <span>Worth another look</span>
                      </div>
                      <div className="weak-areas-grid">
                        {weeklyReview.weakAreas.map((w, idx) => (
                          <div key={idx} className={`weak-card ${w.ck}`}>
                            <div className="weak-top mono">
                              <span className="w-course">{w.course}</span>
                              <span className="w-badge">Saved review topic</span>
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
        <span>Mountain Time</span>
        <details><summary>About source verification</summary>Source verification describes the card’s evidence. Recall progress is tracked separately.</details>
      </footer>
    </PersonalPage>
  );
}
