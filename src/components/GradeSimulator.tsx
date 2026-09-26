"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { CourseStudyInfo } from "@/lib/study-hub-types";

export type GradeCategory = {
  id: string;
  name: string;
  weight: number; // e.g. 30 for 30%
  currentScore: number; // e.g. 95
  isRemaining?: boolean; // if true, it's an upcoming What-If item
};

export type CourseSyllabus = {
  code: string;
  name: string;
  ck: "geo" | "his" | "adm";
  targetGrade: number; // default 93 (A)
  categories: GradeCategory[];
};

const DEFAULT_SYLLABUS_DATA: CourseSyllabus[] = [
  {
    code: "GEOG 1160",
    name: "Home Planet: Land, Water, Life",
    ck: "geo",
    targetGrade: 93,
    categories: [
      { id: "geo1-1", name: "MasteringGeography & Chapter Quizzes", weight: 25, currentScore: 96 },
      { id: "geo1-2", name: "In-Class Activities & Discussion", weight: 15, currentScore: 100 },
      { id: "geo1-3", name: "Midterm Exam 1", weight: 20, currentScore: 92 },
      { id: "geo1-4", name: "Midterm Exam 2 (Upcoming)", weight: 20, currentScore: 90, isRemaining: true },
      { id: "geo1-5", name: "Final Examination (Upcoming)", weight: 20, currentScore: 88, isRemaining: true },
    ],
  },
  {
    code: "GEOG 1160L",
    name: "Home Planet Laboratory",
    ck: "geo",
    targetGrade: 93,
    categories: [
      { id: "geol-1", name: "Weekly Lab Reports (Labs 1–5)", weight: 40, currentScore: 95 },
      { id: "geol-2", name: "Remaining Lab Reports (Labs 6–10)", weight: 30, currentScore: 92, isRemaining: true },
      { id: "geol-3", name: "Lab Practicum & Psychrometric Exam", weight: 20, currentScore: 88, isRemaining: true },
      { id: "geol-4", name: "Attendance & Lab Safety", weight: 10, currentScore: 100 },
    ],
  },
  {
    code: "HIST 300",
    name: "Water in History",
    ck: "his",
    targetGrade: 93,
    categories: [
      { id: "his-1", name: "Primary Source Essays (Papers 1 & 2)", weight: 30, currentScore: 94 },
      { id: "his-2", name: "Primary Source Essay 3 (Upcoming)", weight: 15, currentScore: 90, isRemaining: true },
      { id: "his-3", name: "Midterm Synthesis Exam (Upcoming)", weight: 20, currentScore: 91, isRemaining: true },
      { id: "his-4", name: "Final Research Paper (Upcoming)", weight: 25, currentScore: 89, isRemaining: true },
      { id: "his-5", name: "Seminar Discussion & Annotations", weight: 10, currentScore: 98 },
    ],
  },
  {
    code: "GEOG 1150",
    name: "Intro to Environmental Studies",
    ck: "geo",
    targetGrade: 93,
    categories: [
      { id: "env-1", name: "Chapter Reading Quizzes & Homework", weight: 25, currentScore: 97 },
      { id: "env-2", name: "Film & Case Study Analysis", weight: 20, currentScore: 95 },
      { id: "env-3", name: "Midterm Exam (Upcoming)", weight: 25, currentScore: 92, isRemaining: true },
      { id: "env-4", name: "Sustainable Urban Plan Project", weight: 20, currentScore: 94, isRemaining: true },
      { id: "env-5", name: "Discussion Board Engagement", weight: 10, currentScore: 100 },
    ],
  },
  {
    code: "GEOG 1115L",
    name: "Maps & GIScience Laboratory",
    ck: "geo",
    targetGrade: 93,
    categories: [
      { id: "gis-1", name: "QGIS & Python Labs 1–4", weight: 35, currentScore: 98 },
      { id: "gis-2", name: "Remaining QGIS Labs 5–8", weight: 30, currentScore: 92, isRemaining: true },
      { id: "gis-3", name: "Spatial Analysis Term Project", weight: 20, currentScore: 90, isRemaining: true },
      { id: "gis-4", name: "GIS Lab Practical Exam", weight: 15, currentScore: 88, isRemaining: true },
    ],
  },
];

const STORAGE_KEY = "hb:syllabus-weights:v1";

export default function GradeSimulator({ courses }: { courses: CourseStudyInfo[] }) {
  const [syllabusList, setSyllabusList] = useState<CourseSyllabus[]>(() => {
    if (typeof window === "undefined") return DEFAULT_SYLLABUS_DATA;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_SYLLABUS_DATA;
  });

  const [activeCourseCode, setActiveCourseCode] = useState<string>("GEOG 1160");
  const [isEditingWeights, setIsEditingWeights] = useState<boolean>(false);

  const activeCourse = useMemo(() => {
    return syllabusList.find((c) => c.code === activeCourseCode) || syllabusList[0];
  }, [syllabusList, activeCourseCode]);

  const saveSyllabus = (updatedList: CourseSyllabus[]) => {
    setSyllabusList(updatedList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    } catch {}
  };

  // Grade calculation
  const calculations = useMemo(() => {
    let totalWeight = 0;
    let earnedWeight = 0;
    let remainingWeight = 0;
    let completedWeight = 0;
    let completedScoreSum = 0;

    activeCourse.categories.forEach((cat) => {
      totalWeight += cat.weight;
      earnedWeight += (cat.currentScore * cat.weight) / 100;
      if (cat.isRemaining) {
        remainingWeight += cat.weight;
      } else {
        completedWeight += cat.weight;
        completedScoreSum += (cat.currentScore * cat.weight) / 100;
      }
    });

    const projectedPercent = totalWeight > 0 ? (earnedWeight / totalWeight) * 100 : 0;
    const currentCompletedAvg = completedWeight > 0 ? (completedScoreSum / completedWeight) * 100 : 100;

    // Minimum needed on remaining items to reach target (default 90 for A)
    const target = 90.0;
    const pointsNeeded = target - completedScoreSum;
    const requiredRemainingAvg = remainingWeight > 0 ? (pointsNeeded / remainingWeight) * 100 : 0;

    const letterGrade =
      projectedPercent >= 93
        ? "A"
        : projectedPercent >= 90
        ? "A-"
        : projectedPercent >= 87
        ? "B+"
        : projectedPercent >= 83
        ? "B"
        : projectedPercent >= 80
        ? "B-"
        : "C+";

    return {
      totalWeight,
      projectedPercent: projectedPercent.toFixed(1),
      currentCompletedAvg: currentCompletedAvg.toFixed(1),
      requiredRemainingAvg: Math.max(0, requiredRemainingAvg).toFixed(1),
      letterGrade,
      remainingWeight,
    };
  }, [activeCourse]);

  const handleScoreChange = (catId: string, newScore: number) => {
    const updated = syllabusList.map((course) => {
      if (course.code !== activeCourse.code) return course;
      return {
        ...course,
        categories: course.categories.map((cat) => (cat.id === catId ? { ...cat, currentScore: newScore } : cat)),
      };
    });
    saveSyllabus(updated);
  };

  const handleWeightChange = (catId: string, newWeight: number) => {
    const updated = syllabusList.map((course) => {
      if (course.code !== activeCourse.code) return course;
      return {
        ...course,
        categories: course.categories.map((cat) => (cat.id === catId ? { ...cat, weight: newWeight } : cat)),
      };
    });
    saveSyllabus(updated);
  };

  const handleResetDefaults = () => {
    if (window.confirm(`Reset syllabus weights to default for ${activeCourse.code}?`)) {
      const defaultCourse = DEFAULT_SYLLABUS_DATA.find((c) => c.code === activeCourse.code);
      if (!defaultCourse) return;
      const updated = syllabusList.map((c) => (c.code === activeCourse.code ? defaultCourse : c));
      saveSyllabus(updated);
    }
  };

  return (
    <div className="grade-sim-container mono">
      {/* Header bar */}
      <div className="grade-sim-header">
        <div>
          <span className="deck-eyebrow">ACADEMIC FORECASTING &amp; SYLLABUS SANDBOX</span>
          <h2 style={{ margin: "2px 0 0", fontSize: 20, color: "var(--ink)" }}>Canvas "What-If" Grade Simulator</h2>
        </div>
        <button
          type="button"
          className={`deck-btn mono ${isEditingWeights ? "primary" : ""}`}
          onClick={() => setIsEditingWeights((v) => !v)}
        >
          {isEditingWeights ? "✓ Done Editing Weights" : "✎ Customize Weights"}
        </button>
      </div>

      {/* Course Selector Tabs */}
      <div className="grade-sim-courses-bar">
        {syllabusList.map((c) => {
          const isActive = c.code === activeCourse.code;
          return (
            <button
              key={c.code}
              type="button"
              className={`grade-course-pill mono ${isActive ? "active" : ""} ${c.ck}`}
              onClick={() => setActiveCourseCode(c.code)}
            >
              <span>{c.code}</span>
            </button>
          );
        })}
      </div>

      {/* Grade Hero Score Banner */}
      <div className="grade-hero-banner">
        <div className="gh-score-left">
          <span className="gh-k">Projected Course Grade:</span>
          <div className="gh-big-grade">
            <span className="gh-letter">{calculations.letterGrade}</span>
            <span className="gh-percent">{calculations.projectedPercent}%</span>
          </div>
          <span className="gh-sub">Completed coursework average: {calculations.currentCompletedAvg}%</span>
        </div>

        <div className="gh-target-right">
          <span className="gh-k">Safe-Zone Final Target (A · 90.0%):</span>
          <div className="gh-req-box">
            <span className="gh-req-val">{calculations.requiredRemainingAvg}%</span>
            <span className="gh-req-lbl">minimum average required on remaining {calculations.remainingWeight}% syllabus weight to secure an A.</span>
          </div>
        </div>
      </div>

      {/* Categories & Sliders Table */}
      <div className="grade-categories-card">
        <div className="gcc-head">
          <span>Syllabus Category</span>
          <span>Weight</span>
          <span>What-If Score</span>
          <span>Weighted Pts</span>
        </div>

        <div className="gcc-list">
          {activeCourse.categories.map((cat) => {
            const weightedPts = ((cat.currentScore * cat.weight) / 100).toFixed(1);
            return (
              <div key={cat.id} className={`gcc-row ${cat.isRemaining ? "remaining" : "completed"}`}>
                <div className="gcc-col-name">
                  <span className="gcc-name">{cat.name}</span>
                  {cat.isRemaining && <span className="gcc-rem-tag">What-If Slider</span>}
                </div>

                <div className="gcc-col-weight">
                  {isEditingWeights ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={cat.weight}
                        onChange={(e) => handleWeightChange(cat.id, parseInt(e.target.value, 10) || 0)}
                        className="weight-input mono"
                      />
                      <span>%</span>
                    </div>
                  ) : (
                    <span>{cat.weight}%</span>
                  )}
                </div>

                <div className="gcc-col-score">
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="0.5"
                    value={cat.currentScore}
                    onChange={(e) => handleScoreChange(cat.id, parseFloat(e.target.value))}
                    className="score-slider"
                  />
                  <span className="score-readout">{cat.currentScore}%</span>
                </div>

                <div className="gcc-col-pts">
                  <span className="pts-val">+{weightedPts}%</span>
                </div>
              </div>
            );
          })}
        </div>

        {isEditingWeights && (
          <div className="gcc-footer-edit">
            <span className="edit-warn">
              Total Syllabus Weight:{" "}
              <strong style={{ color: calculations.totalWeight === 100 ? "var(--accent)" : "#e07a5f" }}>
                {calculations.totalWeight}%
              </strong>{" "}
              {calculations.totalWeight !== 100 && "(Weights should sum to 100%)"}
            </span>
            <button type="button" className="deck-btn mono" onClick={handleResetDefaults}>
              ↺ Reset to UNM Standard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
