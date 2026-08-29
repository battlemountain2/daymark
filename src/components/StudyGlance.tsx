"use client";

import Link from "next/link";
import { use } from "react";
import type { StudyHubData } from "@/lib/study-hub";

type Props = {
  promise: Promise<StudyHubData>;
};

export default function StudyGlance({ promise }: Props) {
  const data = use(promise);
  const { courses, weeklyReview, allCards, overallDeckStats } = data;

  const total = allCards.length;
  const verifiedPct = total > 0 ? Math.round((overallDeckStats.verified / total) * 100) : 0;
  const topWeak = weeklyReview.weakAreas?.[0];

  return (
    <section className="card span5 study-glance-card">
      <div className="card-head">
        <h2>Study Hub</h2>
        <Link href="/study" className="morelink mono">
          open hub →
        </Link>
      </div>

      <div className="card-body">
        {/* Term & Deck Progress */}
        <div className="glance-top-stat mono">
          <span>Week {data.currentWeekNumber} · {courses.length} courses</span>
          <span className="pill mono">{verifiedPct}% verified</span>
        </div>

        <div className="deck-progress-track" style={{ marginTop: 8, marginBottom: 12 }}>
          <div
            className="deck-progress-fill verified"
            style={{ width: `${verifiedPct}%` }}
          />
          <div
            className="deck-progress-fill review"
            style={{ width: `${total > 0 ? (overallDeckStats.needsReview / total) * 100 : 0}%` }}
          />
        </div>

        {/* Quick Breakdown Badges */}
        <div className="glance-stats mono">
          <span className="stat-v"><b>{overallDeckStats.verified}</b> verified</span>
          <span className="stat-r"><b>{overallDeckStats.needsReview}</b> need review</span>
          <span className="stat-d"><b>{total}</b> total</span>
        </div>

        {/* Highlighted Weak Area Alert */}
        {topWeak && (
          <div className="glance-alert-box">
            <div className="gab-top mono">
              <span className="gab-k">⚠️ Focus Area: {topWeak.course}</span>
              <span className="gab-pill">needs review</span>
            </div>
            <div className="gab-topic">{topWeak.topic}</div>
            <div className="gab-reason">{topWeak.reason}</div>
          </div>
        )}

        {/* Action Link */}
        <div className="glance-action-row">
          <Link href="/study" className="glance-btn mono">
            Practice Active Recall ({allCards.length} cards) →
          </Link>
        </div>
      </div>
    </section>
  );
}

export function StudyGlanceSkeleton() {
  return (
    <section className="card span5 study-glance-card">
      <div className="card-head">
        <h2>Study Hub</h2>
        <span className="pill mono">loading</span>
      </div>
      <div className="card-body">
        <span className="bar" style={{ width: "60%", height: 16 }} />
        <div className="deck-progress-track" style={{ marginTop: 10, marginBottom: 12 }} />
        <span className="bar" style={{ width: "90%", height: 24 }} />
      </div>
    </section>
  );
}
