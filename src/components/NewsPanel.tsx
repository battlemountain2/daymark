"use client";
import { use, useEffect, useState } from "react";
import type { Story, Category } from "@/lib/feeds";
import type { State } from "@/lib/db";
import { cloudStorage } from "@/lib/cloud-storage";
import { useCloudRevision } from "@/lib/use-cloud-revision";
type Tab = Category | "all" | "listen" | "saved";
const tabs: { key: Tab; label: string }[] = [{key:"all",label:"Your mix"},{key:"news",label:"News"},{key:"music",label:"Music"},{key:"linux",label:"Linux"},{key:"tech",label:"Tech"},{key:"screen",label:"TV + film"},{key:"culture",label:"Culture"},{key:"listen",label:"Audio"},{key:"saved",label:"Saved"}];
type Preferences = Record<string, boolean | Story>;
type Digest = { day: string; provider: string; items: { id: string; summary: string; url: string; source: string }[] };
export default function NewsPanel({ promise, st, mutate }: { promise: Promise<Story[]>; st: State; mutate: (body: Record<string, unknown>) => void }) {
  const stories = use(promise);
  const revision = useCloudRevision();
  const [prefs, setPrefs] = useState<Preferences>({});
  const [tab, setTab] = useState<Tab>("all");
  const [limit, setLimit] = useState(8);
  const [unread, setUnread] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [digest, setDigest] = useState<Digest | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { try { setPrefs(JSON.parse(cloudStorage.getItem("daymark:news") || "{}")); } catch {} }, [revision]);
  function update(key: string, value: boolean | Story) {
    const next = { ...prefs, [key]: value }; setPrefs(next);
    try { cloudStorage.setItem("daymark:news", JSON.stringify(next)); } catch { setMessage("Could not save your preference on this device."); }
  }
  const saved = Object.entries(prefs).filter(([k,v]) => k.startsWith("save:") && v && typeof v === "object").map(([,v]) => v as Story);
  const pool = tab === "saved" ? saved : stories;
  const visible = pool.filter(s => (tab === "all" || tab === "saved" || (tab === "listen" ? s.listen : s.cat === tab)) && (hidden || !st.dismissed.includes(s.id)) && (tab === "saved" || !prefs[`mute:${s.source}`]) && (!unread || !prefs[`read:${s.id}`]));
  async function getDigest() {
    setBusy(true); setMessage("");
    try { const res = await fetch("/api/news-digest", { method: "POST" }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setDigest(data); } catch (e) { setMessage(e instanceof Error ? e.message : "Digest unavailable"); } finally { setBusy(false); }
  }
  return <section className="card span12 news-briefing">
    <div className="card-head"><h2>What&apos;s new</h2><span className="pill mono">Your daily reading room</span></div>
    <div className="card-body">
      <div className="news-intro"><p>A few good stories, then back to your day.</p><button className="btn mono" onClick={() => void getDigest()} disabled={busy}>{busy ? "Preparing…" : "Today's AI digest"}</button></div>
      <p className="sub">A headline-only briefing, generated on request and shared across your devices for the day.</p>
      {message && <p role="status">{message}</p>}
      {digest && <div className="news-digest"><h3>Today in five headlines</h3><ol>{digest.items.map(item => <li key={item.id}>{item.summary} <a href={item.url} target="_blank" rel="noopener noreferrer">{item.source} ↗</a></li>)}</ol><small>{digest.day} · {digest.provider} · Read the sources for full context.</small></div>}
      <div className="newstabs mono" aria-label="Story categories">{tabs.map(t => <button key={t.key} className={tab === t.key ? "on" : ""} aria-pressed={tab === t.key} onClick={() => { setTab(t.key); setLimit(8); }}>{t.label}{t.key === "saved" ? ` (${saved.length})` : ""}</button>)}</div>
      <div className="news-controls"><label><input type="checkbox" checked={unread} onChange={e => setUnread(e.target.checked)} /> Unread only</label><label><input type="checkbox" checked={hidden} onChange={e => setHidden(e.target.checked)} /> Include dismissed</label></div>
      <div className="newslist">{visible.slice(0,limit).map((s,i) => <article key={s.id} className={`news-story${prefs[`read:${s.id}`] ? " is-read" : ""}`}>
        {tab === "all" && i === 0 && <p className="news-kicker mono">Start here · a mix from your sources</p>}
        {tab === "all" && i === 3 && <p className="news-kicker mono">More to explore</p>}
        <a className="news-story-title" href={s.url} target="_blank" rel="noopener noreferrer" onClick={() => update(`read:${s.id}`,true)}>{s.listen ? "▶ " : ""}{s.title}</a>
        <p className="newsmeta mono">{s.source} · {s.cat}{s.mins ? ` · ${s.mins} min listen` : ""}{s.published ? ` · ${s.published.slice(0,10)}` : ""}</p>
        <div className="news-story-actions"><button className="btn quiet mono" aria-pressed={!!prefs[`save:${s.id}`]} onClick={() => update(`save:${s.id}`,prefs[`save:${s.id}`] ? false : s)}>{prefs[`save:${s.id}`] ? "Saved ✓" : s.listen ? "Queue audio" : "Save"}</button><button className="btn quiet mono" onClick={() => update(`read:${s.id}`,!prefs[`read:${s.id}`])}>{prefs[`read:${s.id}`] ? "Mark unread" : "Mark read"}</button><button className="btn quiet mono" onClick={() => mutate({ action:"dismiss",key:s.id,hidden:!st.dismissed.includes(s.id) })}>{st.dismissed.includes(s.id) ? "Restore" : "Dismiss"}</button></div>
      </article>)}</div>
      {!visible.length && <p className="sub">{tab === "saved" ? "Save a story or queue an episode to keep it here." : "No stories match these filters. Try another category or include read stories."}</p>}
      <div className="news-more mono"><span>Showing {Math.min(limit,visible.length)} of {visible.length} matching stories</span>{visible.length > limit && <button className="btn" onClick={() => setLimit(n => n + 8)}>Load more</button>}</div>
      <details className="news-sources"><summary>Choose your sources</summary><p className="sub">Muted sources stay out of your feed. Saved stories remain available.</p>{Array.from(new Set(stories.map(s => s.source))).sort().map(source => <label key={source}><input type="checkbox" checked={!prefs[`mute:${source}`]} onChange={e => update(`mute:${source}`,!e.target.checked)} /> {source}</label>)}</details>
    </div>
  </section>;
}
export function NewsSkeleton() { return <section className="card span12"><div className="card-head"><h2>What&apos;s new</h2><span className="pill mono">Loading your stories…</span></div></section>; }
