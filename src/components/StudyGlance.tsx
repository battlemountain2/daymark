"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import type { StudyHubData } from "@/lib/study-hub-types";
import { getDueCards, loadSRSStore, type SRSStore } from "@/lib/spaced-repetition";
import QuickStudyModal from "@/components/QuickStudyModal";

type Props = {
  promise: Promise<StudyHubData>;
};

export default function StudyGlance({ promise }: Props) {
  const data = use(promise);
  const { courses, weeklyReview, allCards, overallDeckStats } = data;

  const [srsStore, setSrsStore] = useState<SRSStore>({});
  const [isQuickReviewOpen, setIsQuickReviewOpen] = useState<boolean>(false);
  const [todayIso, setTodayIso] = useState<string>(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    setSrsStore(loadSRSStore());
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Denver",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      setTodayIso(parts);
    } catch {}
  }, []);

  const dueCards = getDueCards(allCards, todayIso, srsStore);
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
        {/* Term & Deck Progress Banner */}
        <div className="glance-top-stat mono">
          <span>Week {data.currentWeekNumber} · {courses.length} courses</span>
          <span className="pill mono live">
            {verifiedPct}% mastered
          </span>
        </div>

        {/* Actionable Due Queue Banner */}
        <div className="glance-due-banner">
          <div className="gdb-left">
            <div className="gdb-title mono">
              <span className="gdb-lightning">⚡</span>
              <span className="gdb-count">{dueCards.length}</span>
              <span className="gdb-tag">DUE TODAY</span>
            </div>
            <div className="gdb-sub sub mono">
              {dueCards.length > 0
                ? "Spaced repetition review ready"
                : "All flashcard decks up to date"}
            </div>
          </div>
        </div>

        {/* Highlighted Weak Area Alert */}
        {topWeak && (
          <div className="glance-alert-box">
            <div className="gab-top mono">
              <span className="gab-k">⚠️ Focus: {topWeak.course}</span>
              <span className="gab-pill mono">needs review</span>
            </div>
            <div className="gab-topic">{topWeak.topic}</div>
            <div className="gab-reason">{topWeak.reason}</div>
          </div>
        )}

        {/* Action Button */}
        <div className="glance-action-row">
          {dueCards.length > 0 ? (
            <button
              type="button"
              className="glance-btn primary mono"
              onClick={() => setIsQuickReviewOpen(true)}
            >
              ⚡ Start 5-Min Review ({dueCards.length} cards) →
            </button>
          ) : (
            <Link href="/study" className="glance-btn mono">
              Practice Active Recall ({allCards.length} cards) →
            </Link>
          )}
        </div>
      </div>

      {/* Quick Study Modal */}
      {isQuickReviewOpen && (
        <QuickStudyModal
          dueCards={dueCards}
          onClose={() => {
            setIsQuickReviewOpen(false);
            setSrsStore(loadSRSStore());
          }}
          onFinish={() => {
            setSrsStore(loadSRSStore());
          }}
        />
      )}
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
        <span className="bar" style={{ width: "90%", height: 42, marginTop: 12 }} />
      </div>
    </section>
  );
}
