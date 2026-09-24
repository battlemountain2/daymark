"use client";

import { useState, useEffect } from "react";
import { CODING_CHAPTERS, type CodingChapter, type QuizQuestion } from "@/data/coding-study";

type SavedProgress = {
  [chapterId: string]: {
    completed: boolean;
    highScore: number;
    totalQuestions: number;
  };
};

export default function CodingStudyLab() {
  const [selectedChapterId, setSelectedChapterId] = useState<string>("ch1");
  const [activeSection, setActiveSection] = useState<"quiz" | "gis" | "zed" | "cheatsheet">("quiz");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [qId: number]: number }>({});
  const [quizFinished, setQuizFinished] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [progress, setProgress] = useState<SavedProgress>({});

  const currentChapter = CODING_CHAPTERS.find((c) => c.id === selectedChapterId) || CODING_CHAPTERS[0];
  const questions = currentChapter.questions;
  const currentQuestion = questions[currentQuestionIndex];

  // Load progress from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("daymark:coding-progress");
      if (raw) setProgress(JSON.parse(raw));
    } catch {}
  }, []);

  // Save progress
  const saveProgress = (chId: string, score: number, total: number) => {
    setProgress((prev) => {
      const current = prev[chId];
      const best = current ? Math.max(current.highScore, score) : score;
      const updated = {
        ...prev,
        [chId]: {
          completed: score >= Math.ceil(total * 0.7),
          highScore: best,
          totalQuestions: total,
        },
      };
      try {
        localStorage.setItem("daymark:coding-progress", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleSelectChapter = (chId: string) => {
    setSelectedChapterId(chId);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setQuizFinished(false);
  };

  const handleAnswerSelect = (optionIndex: number) => {
    if (selectedAnswers[currentQuestion.id] !== undefined) return; // Already answered

    const updated = { ...selectedAnswers, [currentQuestion.id]: optionIndex };
    setSelectedAnswers(updated);

    // If last question answered, calculate and save score
    if (Object.keys(updated).length === questions.length) {
      let finalScore = 0;
      questions.forEach((q) => {
        if (updated[q.id] === q.correctIndex) finalScore++;
      });
      saveProgress(currentChapter.id, finalScore, questions.length);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  const handleRestartQuiz = () => {
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setQuizFinished(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Calculate stats
  const totalChapters = CODING_CHAPTERS.length;
  const completedChaptersCount = Object.values(progress).filter((p) => p.completed).length;

  const currentScore = questions.reduce((acc, q) => {
    return selectedAnswers[q.id] === q.correctIndex ? acc + 1 : acc;
  }, 0);

  return (
    <div className="coding-lab-container" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Top Banner / Progress Summary */}
      <div
        className="card-body"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "8px",
          padding: "1rem 1.25rem",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <div>
          <div className="mono" style={{ fontSize: "0.75rem", color: "var(--geo)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            🐍 Python &amp; Spatial Data Science Lab
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--ink)", marginTop: "0.2rem" }}>
            Automate the Boring Stuff with Python (3rd Edition)
          </div>
          <div className="mono" style={{ fontSize: "0.8rem", color: "var(--ink-2)", marginTop: "0.2rem" }}>
            Mastering core Python automation for Geography &amp; GIS applications
          </div>
        </div>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <div
            className="mono"
            style={{
              padding: "0.4rem 0.8rem",
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
              borderRadius: "6px",
              fontSize: "0.75rem",
              color: "var(--ink)",
            }}
          >
            Progress: <strong style={{ color: "var(--accent)" }}>{completedChaptersCount} / {totalChapters}</strong> Chapters Mastered
          </div>
          <a
            href={currentChapter.bookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mono"
            style={{
              padding: "0.4rem 0.8rem",
              background: "var(--accent-soft)",
              border: "1px solid var(--line-strong)",
              borderRadius: "6px",
              fontSize: "0.75rem",
              color: "var(--accent)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Read Chapter Online ↗
          </a>
        </div>
      </div>

      {/* Chapter Selection Bar */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          overflowX: "auto",
          paddingBottom: "0.25rem",
        }}
      >
        {CODING_CHAPTERS.map((ch) => {
          const isSelected = ch.id === selectedChapterId;
          const isDone = progress[ch.id]?.completed;
          const bestScore = progress[ch.id]?.highScore;

          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => handleSelectChapter(ch.id)}
              className="mono"
              style={{
                padding: "0.6rem 1rem",
                borderRadius: "6px",
                border: isSelected ? "2px solid var(--accent)" : "1px solid var(--line)",
                background: isSelected ? "var(--surface)" : "var(--surface-2)",
                color: isSelected ? "var(--ink)" : "var(--ink-2)",
                cursor: "pointer",
                textAlign: "left",
                minWidth: "190px",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, color: isSelected ? "var(--accent)" : "var(--ink)" }}>
                  Chapter {ch.number}
                </span>
                {isDone && <span style={{ color: "var(--good)", fontSize: "0.8rem" }}>✓ Done</span>}
              </div>
              <div style={{ fontSize: "0.8rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "0.15rem" }}>
                {ch.title}
              </div>
              {bestScore !== undefined && (
                <div style={{ fontSize: "0.68rem", color: "var(--ink-3)", marginTop: "0.2rem" }}>
                  Best: {bestScore}/{ch.questions.length}
                </div>
              )}
            </button>
          );
        })}

        {/* Future Chapter Placeholders */}
        {[3, 4, 5, 6].map((num) => (
          <div
            key={num}
            className="mono"
            style={{
              padding: "0.6rem 1rem",
              borderRadius: "6px",
              border: "1px dashed var(--line)",
              background: "transparent",
              color: "var(--ink-3)",
              minWidth: "150px",
              opacity: 0.6,
            }}
          >
            <div style={{ fontWeight: 600 }}>Chapter {num}</div>
            <div style={{ fontSize: "0.75rem", marginTop: "0.15rem" }}>
              {num === 3 ? "Functions" : num === 4 ? "Lists" : num === 5 ? "Dictionaries" : "Strings"}
            </div>
            <div style={{ fontSize: "0.68rem", marginTop: "0.2rem", fontStyle: "italic" }}>
              Queued
            </div>
          </div>
        ))}
      </div>

      {/* Main Chapter Content Card */}
      <section className="card span12 study-card" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
        {/* Chapter Title & Tab Bar */}
        <div
          className="card-head"
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.75rem",
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
              Chapter {currentChapter.number}: {currentChapter.title}
            </h2>
            <p className="mono" style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: "var(--ink-2)" }}>
              {currentChapter.subtitle}
            </p>
          </div>

          {/* Section Mode Switcher */}
          <div className="view-toggle-row mono" style={{ margin: 0 }}>
            <button
              type="button"
              className={`view-toggle-btn ${activeSection === "quiz" ? "active" : ""}`}
              onClick={() => setActiveSection("quiz")}
            >
              🎯 Practice Quiz ({questions.length})
            </button>
            <span className="view-toggle-sep">/</span>
            <button
              type="button"
              className={`view-toggle-btn ${activeSection === "gis" ? "active" : ""}`}
              onClick={() => setActiveSection("gis")}
            >
              🌍 GIS In Practice
            </button>
            <span className="view-toggle-sep">/</span>
            <button
              type="button"
              className={`view-toggle-btn ${activeSection === "zed" ? "active" : ""}`}
              onClick={() => setActiveSection("zed")}
            >
              💻 Zed Challenge
            </button>
            <span className="view-toggle-sep">/</span>
            <button
              type="button"
              className={`view-toggle-btn ${activeSection === "cheatsheet" ? "active" : ""}`}
              onClick={() => setActiveSection("cheatsheet")}
            >
              📖 Cheat Sheet
            </button>
          </div>
        </div>

        <div className="card-body" style={{ padding: "1.25rem" }}>
          {/* 1. QUIZ SECTION */}
          {activeSection === "quiz" && (
            <div>
              {!quizFinished ? (
                <div>
                  {/* Quiz Progress Header */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1rem",
                    }}
                  >
                    <div className="mono" style={{ fontSize: "0.8rem", color: "var(--ink-2)" }}>
                      Question <strong>{currentQuestionIndex + 1}</strong> of <strong>{questions.length}</strong>
                    </div>
                    <div className="mono" style={{ fontSize: "0.8rem", color: "var(--accent)" }}>
                      Current Score: {currentScore} / {Object.keys(selectedAnswers).length}
                    </div>
                  </div>

                  {/* Question Dots */}
                  <div style={{ display: "flex", gap: "0.35rem", marginBottom: "1.25rem" }}>
                    {questions.map((q, idx) => {
                      const isAnswered = selectedAnswers[q.id] !== undefined;
                      const isCorrect = selectedAnswers[q.id] === q.correctIndex;
                      const isCurrent = idx === currentQuestionIndex;

                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => setCurrentQuestionIndex(idx)}
                          style={{
                            flex: 1,
                            height: "6px",
                            borderRadius: "3px",
                            border: isCurrent ? "1px solid var(--accent)" : "none",
                            background: !isAnswered
                              ? isCurrent
                                ? "var(--accent)"
                                : "var(--line)"
                              : isCorrect
                              ? "var(--good)"
                              : "var(--heat)",
                            cursor: "pointer",
                            transition: "background 0.2s",
                          }}
                          title={`Question ${idx + 1}`}
                        />
                      );
                    })}
                  </div>

                  {/* Question Box */}
                  <div
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--line)",
                      borderRadius: "8px",
                      padding: "1.25rem",
                      marginBottom: "1.25rem",
                    }}
                  >
                    <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--ink)", lineHeight: 1.4 }}>
                      {currentQuestion.question}
                    </div>

                    {currentQuestion.codeSnippet && (
                      <pre
                        className="mono"
                        style={{
                          background: "var(--ground)",
                          border: "1px solid var(--line-strong)",
                          borderRadius: "6px",
                          padding: "0.75rem 1rem",
                          margin: "0.75rem 0 0",
                          fontSize: "0.85rem",
                          color: "var(--ink)",
                          overflowX: "auto",
                        }}
                      >
                        {currentQuestion.codeSnippet}
                      </pre>
                    )}
                  </div>

                  {/* Options */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
                    {currentQuestion.options.map((opt, optIdx) => {
                      const answered = selectedAnswers[currentQuestion.id] !== undefined;
                      const isSelected = selectedAnswers[currentQuestion.id] === optIdx;
                      const isCorrect = optIdx === currentQuestion.correctIndex;

                      let borderColor = "var(--line)";
                      let bgColor = "var(--surface)";
                      let textColor = "var(--ink)";

                      if (answered) {
                        if (isCorrect) {
                          borderColor = "var(--good)";
                          bgColor = "var(--surface-2)";
                          textColor = "var(--good)";
                        } else if (isSelected) {
                          borderColor = "var(--heat)";
                          bgColor = "var(--surface-2)";
                          textColor = "var(--heat)";
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleAnswerSelect(optIdx)}
                          disabled={answered}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "0.85rem 1.1rem",
                            borderRadius: "6px",
                            border: `1.5px solid ${borderColor}`,
                            background: bgColor,
                            color: textColor,
                            fontSize: "0.9rem",
                            textAlign: "left",
                            cursor: answered ? "default" : "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <span>{opt}</span>
                          {answered && isCorrect && <span style={{ fontWeight: 700, color: "var(--good)" }}>✓ Correct</span>}
                          {answered && isSelected && !isCorrect && (
                            <span style={{ fontWeight: 700, color: "var(--heat)" }}>✗ Incorrect</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation (Shown once answered) */}
                  {selectedAnswers[currentQuestion.id] !== undefined && (
                    <div
                      style={{
                        padding: "1rem",
                        borderRadius: "6px",
                        border: "1px solid var(--line-strong)",
                        background: "var(--surface-2)",
                        marginBottom: "1.25rem",
                      }}
                    >
                      <div className="mono" style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                        Why this is correct:
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "var(--ink)", lineHeight: 1.45 }}>
                        {currentQuestion.explanation}
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button
                      type="button"
                      disabled={currentQuestionIndex === 0}
                      onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                      className="mono"
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "6px",
                        border: "1px solid var(--line)",
                        background: "var(--surface-2)",
                        color: "var(--ink-2)",
                        cursor: currentQuestionIndex === 0 ? "not-allowed" : "pointer",
                        opacity: currentQuestionIndex === 0 ? 0.4 : 1,
                      }}
                    >
                      ← Previous
                    </button>

                    <button
                      type="button"
                      disabled={selectedAnswers[currentQuestion.id] === undefined}
                      onClick={handleNext}
                      className="mono"
                      style={{
                        padding: "0.5rem 1.25rem",
                        borderRadius: "6px",
                        border: "none",
                        background: selectedAnswers[currentQuestion.id] === undefined ? "var(--line)" : "var(--accent)",
                        color: "#fff",
                        fontWeight: 600,
                        cursor: selectedAnswers[currentQuestion.id] === undefined ? "not-allowed" : "pointer",
                      }}
                    >
                      {currentQuestionIndex === questions.length - 1 ? "Finish Quiz 🎉" : "Next Question →"}
                    </button>
                  </div>
                </div>
              ) : (
                /* Quiz Results Recap */
                <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
                  <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>
                    {currentScore >= Math.ceil(questions.length * 0.7) ? "🏆" : "📚"}
                  </div>
                  <h3 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
                    Quiz Completed!
                  </h3>
                  <p className="mono" style={{ fontSize: "1rem", color: "var(--ink-2)", margin: "0 0 1.5rem" }}>
                    You scored <strong style={{ color: "var(--accent)" }}>{currentScore}</strong> out of{" "}
                    <strong>{questions.length}</strong> (
                    {Math.round((currentScore / questions.length) * 100)}%)
                  </p>

                  <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem" }}>
                    <button
                      type="button"
                      onClick={handleRestartQuiz}
                      className="mono"
                      style={{
                        padding: "0.6rem 1.25rem",
                        borderRadius: "6px",
                        border: "1px solid var(--line)",
                        background: "var(--surface-2)",
                        color: "var(--ink)",
                        cursor: "pointer",
                      }}
                    >
                      Retake Quiz 🔄
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSection("gis")}
                      className="mono"
                      style={{
                        padding: "0.6rem 1.25rem",
                        borderRadius: "6px",
                        border: "none",
                        background: "var(--accent)",
                        color: "#fff",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Explore GIS Application 🌍 →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. GIS APPLICATION SECTION */}
          {activeSection === "gis" && (
            <div>
              <div
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  padding: "1.25rem",
                  marginBottom: "1.25rem",
                }}
              >
                <div className="mono" style={{ fontSize: "0.75rem", color: "var(--geo)", fontWeight: 700, textTransform: "uppercase" }}>
                  Spatial Automation Spotlight
                </div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0.25rem 0 0.5rem", color: "var(--ink)" }}>
                  {currentChapter.gisApplication.title}
                </h3>
                <p style={{ fontSize: "0.9rem", color: "var(--ink-2)", lineHeight: 1.5, margin: 0 }}>
                  {currentChapter.gisApplication.description}
                </p>
              </div>

              <div
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  padding: "1rem 1.25rem",
                  marginBottom: "1.25rem",
                }}
              >
                <div className="mono" style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                  Scenario
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--ink)", lineHeight: 1.4 }}>
                  {currentChapter.gisApplication.realWorldScenario}
                </div>
              </div>

              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <span className="mono" style={{ fontSize: "0.75rem", color: "var(--ink-3)" }}>Python GIS Script</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(currentChapter.gisApplication.code)}
                    className="mono"
                    style={{
                      padding: "0.3rem 0.6rem",
                      fontSize: "0.7rem",
                      borderRadius: "4px",
                      border: "1px solid var(--line)",
                      background: "var(--surface-2)",
                      color: copiedCode ? "var(--good)" : "var(--ink-2)",
                      cursor: "pointer",
                    }}
                  >
                    {copiedCode ? "Copied! ✓" : "Copy Script 📋"}
                  </button>
                </div>
                <pre
                  className="mono"
                  style={{
                    background: "var(--ground)",
                    border: "1px solid var(--line-strong)",
                    borderRadius: "6px",
                    padding: "1rem",
                    margin: 0,
                    fontSize: "0.85rem",
                    color: "var(--ink)",
                    lineHeight: 1.4,
                    overflowX: "auto",
                  }}
                >
                  {currentChapter.gisApplication.code}
                </pre>
              </div>
            </div>
          )}

          {/* 3. ZED CHALLENGE SECTION */}
          {activeSection === "zed" && (
            <div>
              <div
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  padding: "1.25rem",
                  marginBottom: "1.25rem",
                }}
              >
                <div className="mono" style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 700, textTransform: "uppercase" }}>
                  Hands-On Zed Code Challenge
                </div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0.25rem 0 0.5rem", color: "var(--ink)" }}>
                  {currentChapter.zedChallenge.title}
                </h3>
                <p style={{ fontSize: "0.9rem", color: "var(--ink-2)", lineHeight: 1.5, margin: "0 0 0.75rem" }}>
                  {currentChapter.zedChallenge.description}
                </p>
                <div
                  className="mono"
                  style={{
                    padding: "0.6rem 0.8rem",
                    background: "var(--accent-soft)",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    color: "var(--accent)",
                  }}
                >
                  💡 <strong>Hint:</strong> {currentChapter.zedChallenge.hint}
                </div>
              </div>

              <div style={{ position: "relative", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <span className="mono" style={{ fontSize: "0.75rem", color: "var(--ink-3)" }}>
                    Starter Code for Zed (Save as challenge.py and run with F5!)
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(currentChapter.zedChallenge.starterCode)}
                    className="mono"
                    style={{
                      padding: "0.3rem 0.6rem",
                      fontSize: "0.7rem",
                      borderRadius: "4px",
                      border: "1px solid var(--line)",
                      background: "var(--surface-2)",
                      color: copiedCode ? "var(--good)" : "var(--ink-2)",
                      cursor: "pointer",
                    }}
                  >
                    {copiedCode ? "Copied! ✓" : "Copy Starter Code 📋"}
                  </button>
                </div>
                <pre
                  className="mono"
                  style={{
                    background: "var(--ground)",
                    border: "1px solid var(--line-strong)",
                    borderRadius: "6px",
                    padding: "1rem",
                    margin: 0,
                    fontSize: "0.85rem",
                    color: "var(--ink)",
                    lineHeight: 1.4,
                    overflowX: "auto",
                  }}
                >
                  {currentChapter.zedChallenge.starterCode}
                </pre>
              </div>

              <div>
                <span className="mono" style={{ fontSize: "0.75rem", color: "var(--ink-3)" }}>Expected Terminal Output</span>
                <pre
                  className="mono"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--line)",
                    borderRadius: "6px",
                    padding: "0.75rem 1rem",
                    margin: "0.4rem 0 0",
                    fontSize: "0.8rem",
                    color: "var(--ink)",
                    overflowX: "auto",
                  }}
                >
                  {currentChapter.zedChallenge.expectedOutput}
                </pre>
              </div>
            </div>
          )}

          {/* 4. CHEAT SHEET & KEY CONCEPTS */}
          {activeSection === "cheatsheet" && (
            <div>
              <p style={{ fontSize: "0.9rem", color: "var(--ink-2)", margin: "0 0 1rem", lineHeight: 1.4 }}>
                {currentChapter.summary}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.75rem" }}>
                {currentChapter.keyConcepts.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--line)",
                      borderRadius: "6px",
                      padding: "1rem",
                    }}
                  >
                    <div className="mono" style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--accent)", marginBottom: "0.3rem" }}>
                      {item.term}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--ink)", lineHeight: 1.4, marginBottom: item.codeExample ? "0.6rem" : "0" }}>
                      {item.definition}
                    </div>
                    {item.codeExample && (
                      <pre
                        className="mono"
                        style={{
                          background: "var(--ground)",
                          border: "1px solid var(--line-strong)",
                          borderRadius: "4px",
                          padding: "0.5rem 0.75rem",
                          margin: 0,
                          fontSize: "0.75rem",
                          color: "var(--ink)",
                          overflowX: "auto",
                        }}
                      >
                        {item.codeExample}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
