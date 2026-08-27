"use client";

import { use, useEffect, useState } from "react";
import type { Story, Category } from "@/lib/feeds";
import type { State } from "@/lib/db";

/**
 * What's new in the things he actually follows.
 *
 * Dismissals share the existing `dismissed` table, so hiding a story on the
 * phone hides it on the laptop — the same reason this app has a server at all.
 */

const TABS: Array<{ key: Category | "all" | "listen"; label: string }> = [
  { key: "all", label: "everything" },
  { key: "news", label: "news" },
  { key: "music", label: "music" },
  { key: "linux", label: "linux" },
  { key: "tech", label: "tech" },
  { key: "screen", label: "tv + film" },
  { key: "listen", label: "listen" },
];

const CAT_LABEL: Record<Category, string> = {
  linux: "linux", music: "music", tech: "tech", screen: "tv + film", news: "news",
};

/**
 * Relative age, from a clock captured on mount rather than `Date.now()` at
 * render time.
 *
 * Calling `Date.now()` during render is a hydration bug: the server stamps
 * "45m ago" into the HTML and the browser hydrates a minute later and wants
 * "46m ago", so React throws #418 and re-renders the whole tree on the client.
 * It was firing on every page load — invisible in the UI, which is exactly why
 * it survived. Served from the offline cache the gap is hours, not minutes.
 *
 * `now === null` before mount means the server and the client's first render
 * agree on rendering *no* age at all, which is what makes hydration match; the
 * effect then fills it in.
 */
const age = (iso: string | null, now: number | null): string => {
  if (!iso || now === null) return "";
  const h = (now - Date.parse(iso)) / 3.6e6;
  if (!isFinite(h)) return "";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`;
  if (h < 24) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
};

type Props = {
  promise: Promise<Story[]>;
  st: State;
  mutate: (body: Record<string, unknown>) => void;
};

export default function NewsPanel({ promise, st, mutate }: Props) {
  const stories = use(promise);
  const [tab, setTab] = useState<Category | "all" | "listen">("all");
  const [showHidden, setShowHidden] = useState(false);
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
    const t = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  // "listen" cuts across the categories rather than being one of them: an NPR
  // Music episode is music *and* audio, and it should appear under both.
  const inTab = stories.filter((s) =>
    tab === "all" ? true : tab === "listen" ? s.listen : s.cat === tab
  );
  const hiddenCount = inTab.filter((s) => st.dismissed.includes(s.id)).length;
  const visible = inTab.filter((s) => showHidden || !st.dismissed.includes(s.id));

  return (
    <section className="card span7">
      <div className="card-head">
        <h2>What&apos;s new</h2>
        <span className={`pill mono ${stories.length ? "live" : ""}`}>
          {stories.length ? `${stories.length} stories` : "no feeds reachable"}
        </span>
      </div>
      <div className="card-body">
        <div className="newstabs mono">
          {TABS.map((t) => (
            <button key={t.key} type="button" className={tab === t.key ? "on" : ""}
              aria-pressed={tab === t.key} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {!stories.length && (
          <div className="sub" style={{ marginTop: 12 }}>
            No feeds responded. They&apos;re fetched server-side and cached for 30
            minutes, so this usually means a publisher started blocking us.
          </div>
        )}

        <div className="newslist">
          {visible.slice(0, 12).map((s) => {
            const hidden = st.dismissed.includes(s.id);
            return (
              <div className={`newsrow${hidden ? " hid" : ""}`} key={s.id}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.listen && <span className="listenmark" aria-label="Audio">▸</span>}
                  {s.title}
                </a>
                <div className="mono newsmeta">
                  {[s.source, CAT_LABEL[s.cat],
                    s.mins ? `${s.mins} min listen` : null,
                    s.published ? `${age(s.published, nowMs)} ago` : null]
                    .filter(Boolean).join(" · ")}
                </div>
                <button className="btn quiet mono newsx"
                  title={hidden ? "Bring this back" : "Dismiss this"}
                  onClick={() => mutate({ action: "dismiss", key: s.id, hidden: !hidden })}>
                  {hidden ? "↺" : "×"}
                </button>
              </div>
            );
          })}
        </div>

        {hiddenCount > 0 && (
          <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 10 }}>
            {hiddenCount} dismissed ·{" "}
            <button className="btn quiet mono" style={{ padding: 0, textDecoration: "underline" }}
              onClick={() => setShowHidden((v) => !v)}>
              {showHidden ? "hide again" : "show"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export function NewsSkeleton() {
  return (
    <section className="card span7">
      <div className="card-head"><h2>What&apos;s new</h2><span className="pill mono">loading</span></div>
      <div className="card-body">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ padding: "9px 0" }}>
            <span className="bar" style={{ width: `${76 - i * 9}%` }} />
            <span className="bar sm" style={{ width: `${26 - i * 2}%` }} />
          </div>
        ))}
      </div>
    </section>
  );
}
