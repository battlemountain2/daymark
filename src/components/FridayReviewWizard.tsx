"use client";

import { useState } from "react";
import type { WeeklyReviewData } from "@/lib/study-hub-types";

type Props = {
  data: WeeklyReviewData;
  onClose: () => void;
};

export default function FridayReviewWizard({ data, onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [takeawayIdx, setTakeawayIdx] = useState<number>(0);
  const [checkedReadings, setCheckedReadings] = useState<Record<number, boolean>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<number, boolean>>({});

  const toggleReading = (idx: number) => {
    setCheckedReadings((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleQuizAnswer = (qIdx: number, isCorrect: boolean) => {
    setQuizAnswers((prev) => ({ ...prev, [qIdx]: isCorrect }));
  };

  return (
    <div className="brief-modal-scrim" onClick={onClose} role="dialog" aria-modal="true">
      <div className="friday-wizard-box" onClick={(e) => e.stopPropagation()}>
        {/* Wizard Header */}
        <div className="fw-header">
          <div className="fw-title-block">
            <span className="pill mono live">✦ Friday 8:00 PM Ritual</span>
            <span className="fw-week-title">{data.weekTitle}</span>
          </div>
          <button type="button" className="brief-close-btn mono" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Wizard Stepper Tabs */}
        <div className="fw-stepper mono">
          <button
            type="button"
            className={`fws-btn ${step === 1 ? "on" : ""}`}
            onClick={() => setStep(1)}
          >
            1. Readings Check
          </button>
          <button
            type="button"
            className={`fws-btn ${step === 2 ? "on" : ""}`}
            onClick={() => setStep(2)}
          >
            2. The 5 Takeaways
          </button>
          <button
            type="button"
            className={`fws-btn ${step === 3 ? "on" : ""}`}
            onClick={() => setStep(3)}
          >
            3. Weak Area Quiz
          </button>
          <button
            type="button"
            className={`fws-btn ${step === 4 ? "on" : ""}`}
            onClick={() => setStep(4)}
          >
            4. Mastered Badge
          </button>
        </div>

        {/* Wizard Body */}
        <div className="fw-body">
          {/* STEP 1: READINGS CHECK */}
          {step === 1 && (
            <div className="fw-step-content">
              <h3>Step 1: Check Off This Week&apos;s Readings</h3>
              <p className="sub mono">
                Acknowledge the primary &amp; secondary sources reviewed across your 6 courses.
              </p>

              <div className="fw-checklist">
                {[
                  "POLS 2120: Carol Cohn (Signs 1987) & Norms / Models",
                  "HIST 300: Paul Sutter (2013) & Ancient Near East Irrigation",
                  "GEOG 1160: Earth Systems, Insolation & Air Quality",
                  "GEOG 1150: Environmental Policy, NEPA & Clean Air Act",
                  "GEOG 1115L: Coordinate Systems, Projections & Vector/Raster",
                  "PHED 2996: Body Composition & Standardized Girth Testing",
                ].map((item, idx) => {
                  const isDone = !!checkedReadings[idx];
                  return (
                    <label key={idx} className={`fw-check-item ${isDone ? "done" : ""}`}>
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => toggleReading(idx)}
                      />
                      <span className="mono">{item}</span>
                    </label>
                  );
                })}
              </div>

              <div className="fw-actions">
                <button type="button" className="deck-btn primary mono" onClick={() => setStep(2)}>
                  Proceed to 5 Takeaways →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: 5 TAKEAWAYS CAROUSEL */}
          {step === 2 && (
            <div className="fw-step-content">
              <div className="fw-takeaway-header mono">
                <span>Core Takeaway {takeawayIdx + 1} of {data.takeaways.length}</span>
                <span className={`tagdot ${data.takeaways[takeawayIdx]?.ck}`} />
              </div>

              {data.takeaways[takeawayIdx] && (
                <div className={`fw-takeaway-card ${data.takeaways[takeawayIdx].ck}`}>
                  <div className="fwt-course mono">{data.takeaways[takeawayIdx].course}</div>
                  <div className="fwt-title">{data.takeaways[takeawayIdx].title}</div>
                  <div className="fwt-detail">{data.takeaways[takeawayIdx].detail}</div>
                </div>
              )}

              <div className="fw-actions" style={{ justifyContent: "space-between" }}>
                <button
                  type="button"
                  className="deck-btn mono"
                  disabled={takeawayIdx === 0}
                  onClick={() => setTakeawayIdx((i) => i - 1)}
                >
                  ← Previous
                </button>
                {takeawayIdx + 1 < data.takeaways.length ? (
                  <button
                    type="button"
                    className="deck-btn primary mono"
                    onClick={() => setTakeawayIdx((i) => i + 1)}
                  >
                    Next Takeaway →
                  </button>
                ) : (
                  <button
                    type="button"
                    className="deck-btn primary mono"
                    onClick={() => setStep(3)}
                  >
                    Proceed to Weak Area Quiz →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: WEAK AREA QUIZ */}
          {step === 3 && (
            <div className="fw-step-content">
              <h3>Step 3: Weak Area Speed Quiz</h3>
              <p className="sub mono">
                Targeted self-checks covering this week&apos;s flagged retention weak spots.
              </p>

              <div className="fw-weak-quiz-list">
                {data.weakAreas.map((w, idx) => {
                  const ans = quizAnswers[idx];
                  return (
                    <div key={idx} className={`fw-weak-quiz-item ${w.ck}`}>
                      <div className="fwq-top mono">
                        <span className="fwq-course">{w.course}</span>
                        <span className="fwq-topic">{w.topic}</span>
                      </div>
                      <div className="fwq-reason sub">{w.reason}</div>
                      <div className="fwq-check-row mono">
                        <span className="sub">Do you feel confident on this concept now?</span>
                        <div className="fwq-btns">
                          <button
                            type="button"
                            className={`fwq-btn ${ans === true ? "yes" : ""}`}
                            onClick={() => handleQuizAnswer(idx, true)}
                          >
                            ✓ Solid
                          </button>
                          <button
                            type="button"
                            className={`fwq-btn ${ans === false ? "no" : ""}`}
                            onClick={() => handleQuizAnswer(idx, false)}
                          >
                            Review Deck
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="fw-actions">
                <button type="button" className="deck-btn primary mono" onClick={() => setStep(4)}>
                  Complete Synthesis &amp; Stamp Week →
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: CELEBRATION BADGE */}
          {step === 4 && (
            <div className="fw-step-content" style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
              <h2 style={{ margin: "0 0 8px" }}>Weekly Synthesis Complete!</h2>
              <p className="sub mono" style={{ maxWidth: 440, margin: "0 auto 20px" }}>
                You have completed your Friday 8:00 PM review ritual. All 6 course frameworks, takeaways, and weak spots are reinforced.
              </p>
              <div className="fw-stamp-badge mono">
                <span>🔥 SEMESTER SYNTHESIS STREAK ACTIVE</span>
              </div>
              <div className="fw-actions" style={{ justifyContent: "center", marginTop: 24 }}>
                <button type="button" className="deck-btn primary mono" onClick={onClose}>
                  Done &amp; Close Wizard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
