"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { localDay } from "@/lib/localtime";
import type { StudyHubData } from "@/lib/study-hub-types";
import { getDueCards, loadSRSStore, type SRSStore } from "@/lib/spaced-repetition";
import QuickStudyModal from "@/components/QuickStudyModal";
import { useCloudRevision } from "@/lib/use-cloud-revision";
import {recentReviewTopics} from "@/lib/review-insights";

type Props = {
  promise: Promise<StudyHubData>;
};

export default function StudyGlance({ promise }: Props) {
  const data = use(promise);
  const cloudRevision = useCloudRevision();
  const { courses, allCards, overallDeckStats } = data;

  const [srsStore, setSrsStore] = useState<SRSStore>({});
  const [isQuickReviewOpen, setIsQuickReviewOpen] = useState<boolean>(false);
  const [todayIso, setTodayIso] = useState<string>(() => localDay());

  useEffect(() => {
    setSrsStore(loadSRSStore());
    const updateDay = () => setTodayIso(localDay());
    updateDay();
    const timer = setInterval(updateDay, 60000);
    window.addEventListener("focus", updateDay);
    return () => {clearInterval(timer);window.removeEventListener("focus", updateDay);};
  }, [cloudRevision]);

  const dueCards = getDueCards(allCards, todayIso, srsStore);
  const total = allCards.length;
  const verifiedPct = total > 0 ? Math.round((overallDeckStats.verified / total) * 100) : 0;
  const topWeak = recentReviewTopics(allCards,srsStore,todayIso)[0];

  return (
    <section className="card span5 study-glance-card">
      <div className="card-head">
        <h2>Study Hub</h2>
        <Link href="/study" className="morelink mono">
          open hub →
        </Link>
      </div>

      <div className="card-body">
        <div className="study-preview"><div><span className="mono sub">WEEK {data.currentWeekNumber} · {courses.length} COURSES</span><h3>Review queue</h3></div><div className="study-queue"><strong>{dueCards.length}</strong><span>{dueCards.length ? "cards ready to review" : "Nothing due today"}</span><small className="sub">{verifiedPct}% source-verified</small></div></div>
        <div className="study-preview-actions">{dueCards.length > 0 ? <button type="button" onClick={() => setIsQuickReviewOpen(true)}>Start a short review →</button> : <Link href="/study">Open practice →</Link>}<Link href="/study?mode=quiz">Try a quiz</Link></div>
        {topWeak && <details className="personal-setup"><summary>Recent reviews · {topWeak.course}</summary><p className="sub">{topWeak.count} {topWeak.count===1?'card was':'cards were'} rated Again or Hard in the last seven days. These may be worth another look.</p><Link href={`/study?course=${encodeURIComponent(topWeak.course)}`}>Open course cards ↗</Link></details>}

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
