"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import type { Story, Category } from "@/lib/feeds";
import type { State } from "@/lib/db";
import { cloudStorage } from "@/lib/cloud-storage";
import { useCloudRevision } from "@/lib/use-cloud-revision";
type Tab = Category | "all" | "listen" | "saved";
const tabs: { key: Tab; label: string }[] = [{key:"all",label:"Your mix"},{key:"news",label:"News"},{key:"music",label:"Music"},{key:"linux",label:"Linux"},{key:"tech",label:"Tech"},{key:"screen",label:"TV + film"},{key:"culture",label:"Culture"},{key:"listen",label:"Audio"},{key:"saved",label:"Saved"}];
type Preferences = Record<string, boolean | Story>;
type Digest = { day: string; provider: string; items: { id: string; summary: string; url: string; source: string }[] };
export default function NewsPanel({ promise, st, mutate,space='media',onBrowse }: { promise: Promise<Story[]>; st: State; mutate: (body: Record<string, unknown>) => void;space?:string;onBrowse?:()=>void }) {
  const stories = use(promise);
  const baseLimit = space === "main" ? 5 : 8;
  const revision = useCloudRevision();
  const [prefs, setPrefs] = useState<Preferences>({});
  const [tab, setTab] = useState<Tab>("all");
  const [limit, setLimit] = useState(space === "main" ? 5 : 8);
  const [undoDismiss,setUndoDismiss] = useState<string|null>(null);
  const [unread, setUnread] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [digest, setDigest] = useState<Digest | null>(null);
  const [busy, setBusy] = useState(false);
  const [query,setQuery] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { try { setPrefs(JSON.parse(cloudStorage.getItem("daymark:news") || "{}")); } catch {} }, [revision]);
  useEffect(()=>{try{const v=JSON.parse(cloudStorage.getItem('daymark:layout')||'{}')[`news-view:${space}`];if(v){if(tabs.some(t=>t.key===v.tab))setTab(v.tab);setLimit(space === "main" ? 5 : Math.max(4,Math.min(80,Number(v.limit)||8)));setUnread(v.unread===true);setHidden(v.hidden===true);}}catch{}},[revision,space]);
  function view(patch:Record<string,unknown>){try{const layout=JSON.parse(cloudStorage.getItem('daymark:layout')||'{}');layout[`news-view:${space}`]={tab,limit,unread,hidden,...patch};cloudStorage.setItem('daymark:layout',JSON.stringify(layout));}catch{setMessage('Could not save story filters.');}}
  function update(key: string, value: boolean | Story) {
    try { const latest = JSON.parse(cloudStorage.getItem("daymark:news") || "{}"); const next = {...latest,[key]:value}; cloudStorage.setItem("daymark:news", JSON.stringify(next)); setPrefs(next); } catch { setMessage("Could not save your preference on this device."); }
  }
  const saved = Object.entries(prefs).filter(([k,v]) => k.startsWith("save:") && v && typeof v === "object").map(([,v]) => v as Story);
  const pool = tab === "saved" ? saved : stories;
  const visible = pool.filter(s => (!query.trim()||`${s.title} ${s.source}`.toLowerCase().includes(query.trim().toLowerCase())) && (tab === "all" || tab === "saved" || (tab === "listen" ? s.listen : s.cat === tab)) && (hidden || !st.dismissed.includes(s.id)) && (tab === "saved" || !prefs[`mute:${s.source}`]) && (!unread || !prefs[`read:${s.id}`]));
  async function getDigest() {
    setBusy(true); setMessage("");
    try { const res = await fetch("/api/news-digest", { method: "POST" }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setDigest(data); } catch (e) { setMessage(e instanceof Error ? e.message : "Digest unavailable"); } finally { setBusy(false); }
  }
  return <section className="card span12 news-briefing">
    <div className="card-head"><h2>What&apos;s new</h2></div>
    <div className="card-body">
      <div className="news-quick-tabs" aria-label="Quick story categories">{tabs.filter(t=>["all","music","screen","saved"].includes(t.key)).map(t=><button key={t.key} aria-pressed={tab===t.key} onClick={()=>{setTab(t.key);setLimit(baseLimit);view({tab:t.key,limit:baseLimit});}}>{t.label}{t.key==='saved'?` (${saved.length})`:''}</button>)}</div>
      {message && <p role="status">{message}</p>}
      {digest && <div className="news-digest"><h3>Today in five headlines</h3><ol>{digest.items.map(item => <li key={item.id}>{item.summary} <a href={item.url} target="_blank" rel="noopener noreferrer">{item.source} ↗</a></li>)}</ol><small>{digest.day} · {digest.provider} · Read the sources for full context.</small></div>}
      <details className="news-browse-settings"><summary>Filters & search</summary><input type="search" aria-label="Search stories" placeholder="Search headlines or sources…" value={query} onChange={e=>setQuery(e.target.value)}/><div className="newstabs" aria-label="Story categories">{tabs.map(t => <button key={t.key} className={tab === t.key ? "on" : ""} aria-pressed={tab === t.key} onClick={() => { setTab(t.key); setLimit(baseLimit);view({tab:t.key,limit:baseLimit}); }}>{t.label}{t.key === "saved" ? ` (${saved.length})` : ""}</button>)}</div>
      <div className="news-controls"><label><input type="checkbox" checked={unread} onChange={e => {setUnread(e.target.checked);view({unread:e.target.checked});}} /> Unread only</label><label><input type="checkbox" checked={hidden} onChange={e => {setHidden(e.target.checked);view({hidden:e.target.checked});}} /> Include dismissed</label></div></details>
      <div className="newslist">{visible.slice(0,space === "main" ? 5 : limit).map(s => <article key={s.id} className={`news-story${prefs[`read:${s.id}`] ? " is-read" : ""}`}>
        <a className="news-story-title" href={s.url} target="_blank" rel="noopener noreferrer" onClick={() => update(`read:${s.id}`,true)}>{s.listen ? "▶ " : ""}{s.title}</a>
        <p className="newsmeta mono">{s.source} · {s.cat}{s.mins ? ` · ${s.mins} min listen` : ""}{s.published ? ` · ${s.published.slice(0,10)}` : ""}</p>
        <details className="news-story-menu"><summary aria-label={`Options for ${s.title}`}>•••</summary><div className="news-story-actions"><button className="btn quiet mono" aria-pressed={!!prefs[`save:${s.id}`]} onClick={() => update(`save:${s.id}`,prefs[`save:${s.id}`] ? false : s)}>{prefs[`save:${s.id}`] ? "Saved ✓" : s.listen ? "Queue audio" : "Save"}</button><button className="btn quiet mono" onClick={() => update(`read:${s.id}`,!prefs[`read:${s.id}`])}>{prefs[`read:${s.id}`] ? "Mark unread" : "Mark read"}</button><button className="btn quiet mono" onClick={() => {mutate({ action:"dismiss",key:s.id,hidden:!st.dismissed.includes(s.id) });if(!st.dismissed.includes(s.id))setUndoDismiss(s.id);}}>{st.dismissed.includes(s.id) ? "Restore" : "Dismiss"}</button></div></details>
      </article>)}</div>
      {!visible.length && <p className="sub">{tab === "saved" ? "Save a story or queue an episode to keep it here." : "No stories match these filters. Try another category or include read stories."}</p>}
      {undoDismiss&&<p role="status" className="panel-undo">Story dismissed <button type="button" onClick={()=>{mutate({action:"dismiss",key:undoDismiss,hidden:false});setUndoDismiss(null);}}>Undo</button></p>}
      {space === "main" ? <Link className="news-all-link" href="/?space=media#news" onClick={e=>{if(onBrowse){e.preventDefault();onBrowse();}}}>Browse all stories ↗</Link> : <div className="news-more mono"><span>Showing {Math.min(limit,visible.length)} of {visible.length} matching stories</span>{visible.length > limit && <button className="btn" onClick={() => {setLimit(n => n + 8);view({limit:limit+8});}}>Load more</button>}{limit>8&&<button className="btn" onClick={()=>{setLimit(8);view({limit:8});document.getElementById("news")?.scrollIntoView({behavior:"smooth",block:"start"});}}>Show less</button>}</div>}
      <details className="news-digest-settings"><summary>Today’s digest</summary><button className="btn mono" onClick={()=>void getDigest()} disabled={busy}>{busy?"Preparing…":"Prepare digest"}</button></details>
      <details className="news-sources"><summary>Choose your sources</summary><p className="sub">Muted sources stay out of your feed. Saved stories remain available.</p>{Array.from(new Set(stories.map(s => s.source))).sort().map(source => <label key={source}><input type="checkbox" checked={!prefs[`mute:${source}`]} onChange={e => update(`mute:${source}`,!e.target.checked)} /> {source}</label>)}</details>
    </div>
  </section>;
}
export function NewsSkeleton() { return <section className="card span12"><div className="card-head"><h2>What&apos;s new</h2><span className="pill mono">Loading your stories…</span></div></section>; }
