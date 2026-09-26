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

  const weekNum = data.weekTitle.match(/\d+/)?.[0] || "5";

  const generateReportMarkdown = () => {
    const lines = [
      `# DAYMARK ACADEMIC EXECUTIVE BRIEF`,
      `**Term**: Fall 2026 · Week ${weekNum}`,
      `**Synthesis Date**: ${data.scheduledReviewDate} Ritual`,
      `**Student**: Brayan | University of New Mexico`,
      ``,
      `---`,
      ``,
      `## I. CORE COURSE SYNTHESIS & TAKEAWAYS`,
    ];

    data.takeaways.forEach((t, i) => {
      lines.push(`### 0${i + 1}. [${t.course}] ${t.title}`);
      lines.push(`${t.detail}`);
      lines.push(``);
    });

    lines.push(`---`);
    lines.push(``);
    lines.push(`## II. IDENTIFIED WEAK SPOTS & RESOLUTION NOTES`);
    data.weakAreas.forEach((w) => {
      lines.push(`- **${w.course}**: ${w.topic}`);
      lines.push(`  *Resolution Strategy*: ${w.reason}`);
    });

    lines.push(``);
    lines.push(`---`);
    lines.push(``);
    lines.push(`## III. SYNTHESIS STREAK & VERIFICATION`);
    lines.push(`- **Weekly Review Ritual**: Fully Completed & Verified`);
    lines.push(`- **Active Courses Covered**: 5 Active Frameworks (GEOG 1160, GEOG 1160L, HIST 300, GEOG 1150, GEOG 1115L)`);
    lines.push(`- **Status**: Ready for Week ${parseInt(weekNum, 10) + 1}`);
    lines.push(``);
    lines.push(`*Generated via Daymark Academic Cockpit.*`);
    return lines.join("\n");
  };

  const handleDownloadReport = () => {
    const md = generateReportMarkdown();
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Daymark-Week-0${weekNum}-Executive-Brief.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Daymark Week ${weekNum} Executive Brief</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #111; line-height: 1.6; max-width: 800px; margin: 0 auto; }
            h1 { font-size: 22px; border-bottom: 2px solid #222; padding-bottom: 8px; margin-bottom: 6px; }
            h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 0.05em; color: #444; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-top: 24px; }
            h3 { font-size: 14px; margin-bottom: 4px; color: #1a4d2e; }
            p { margin: 0 0 10px; font-size: 13px; }
            ul { margin: 0 0 16px 20px; font-size: 13px; }
            li { margin-bottom: 6px; }
            .meta { font-family: monospace; font-size: 12px; color: #666; margin-bottom: 20px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>DAYMARK ACADEMIC EXECUTIVE BRIEF</h1>
          <div class="meta">Term: Fall 2026 · Week ${weekNum} | Date: ${data.scheduledReviewDate} | Student: Brayan</div>
          <h2>I. Core Course Synthesis & Takeaways</h2>
          ${data.takeaways.map((t, i) => `<h3>0${i+1}. [${t.course}] ${t.title}</h3><p>${t.detail}</p>`).join("")}
          <h2>II. Identified Weak Spots & Targeted Strategies</h2>
          <ul>
            ${data.weakAreas.map(w => `<li><strong>${w.course} - ${w.topic}:</strong> ${w.reason}</li>`).join("")}
          </ul>
          <h2>III. Semester Synthesis Status</h2>
          <p>✓ All 5 course frameworks acknowledged, synthesized, and verified for Week ${weekNum}.</p>
          <script>window.onload = function() { window.print(); }<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
                Acknowledge the primary &amp; secondary sources reviewed across your active Fall 2026 courses.
              </p>

              <div className="fw-checklist">
                {[
                  "GEOG 1160: Ch. 5 Global Winds, Pressure Belts & Coriolis Deflection",
                  "GEOG 1160L: Psychrometric Tables, Dew Point & Adiabatic Lapse Rates",
                  "HIST 300: Arnold Ch. 4 Indian Ocean Monsoons & Maritime Trade",
                  "GEOG 1150: Ch. 22 Urbanization, Land Use Zoning & Transit-Oriented Form",
                  "GEOG 1115L: Vector Spatial Queries, Topological Operators & Python Bounding Boxes",
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

          {/* STEP 4: CELEBRATION BADGE & EXECUTIVE REPORT */}
          {step === 4 && (
            <div className="fw-step-content" style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
              <h2 style={{ margin: "0 0 8px" }}>Weekly Synthesis Complete!</h2>
              <p className="sub mono" style={{ maxWidth: 460, margin: "0 auto 16px" }}>
                You have completed your Friday 8:00 PM review ritual. All 5 course frameworks, takeaways, and weak spots are reinforced.
              </p>
              <div className="fw-stamp-badge mono">
                <span>🔥 SEMESTER SYNTHESIS STREAK ACTIVE</span>
              </div>

              {/* 1-Click Executive Report Export */}
              <div className="fw-export-box" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--line)", borderRadius: 10, padding: "16px", maxWidth: 460, margin: "24px auto 0" }}>
                <div className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", marginBottom: 6 }}>
                  📄 1-Page Academic Executive Brief
                </div>
                <p className="sub mono" style={{ fontSize: 11, margin: "0 0 14px", color: "var(--ink-2)" }}>
                  Download your complete Week {weekNum} synthesis takeaways, citations, and study stats for archiving.
                </p>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button type="button" className="deck-btn mono" onClick={handleDownloadReport} title="Save as Markdown (.md)">
                    📥 Download .md
                  </button>
                  <button type="button" className="deck-btn mono" onClick={handlePrintPDF} title="Print or Save as PDF">
                    🖨️ Print / Save PDF
                  </button>
                </div>
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
