"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePersonalRecords } from "@/lib/use-personal-records";
import type { YouTubeStatus, YouTubeVideo } from "@/lib/youtube-contract";
import YouTubeVideoCard, { type VideoChoice } from "./YouTubeVideoCard";
import "./youtube.css";

type Feed = YouTubeStatus & { data: YouTubeVideo[]; checkedAt: string | null; stale: boolean; warning?: string };
export default function YouTubePanel() {
  const [feed, setFeed] = useState<Feed | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"feed" | "saved">("feed"), [limit, setLimit] = useState(6), [hidden, setHidden] = useState(false);
  const { records, update, loaded, error: saveError } = usePersonalRecords<VideoChoice>("daymark:youtube");
  const load = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/youtube", { cache: "no-store" }), data = await response.json();
      if (!response.ok) throw Error(data.error || "YouTube could not load.");
      setFeed(data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "YouTube could not load."); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const saved = Object.values(records).filter(video => video.saved);
  const videos = (tab === "saved" ? saved : feed?.data || []).filter(video => hidden || (!records[video.id]?.dismissed && !records[video.id]?.watched));
  function choose(video: YouTubeVideo, field: "saved" | "watched" | "dismissed") {
    update(video.id, current => ({ ...video, ...current, [field]: !current?.[field] }));
  }
  return <section className="card youtube-panel">
    <div className="card-head"><h2>From your channels</h2><Link href="/connections#connection-youtube">Manage channels ↗</Link></div>
    <div className="card-body">
      <div className="youtube-toolbar"><div role="group" aria-label="Video shelves"><button className="btn" aria-pressed={tab === "feed"} onClick={() => { setTab("feed"); setLimit(6); }}>New uploads</button><button className="btn" aria-pressed={tab === "saved"} onClick={() => { setTab("saved"); setLimit(6); }}>Saved ({saved.length})</button></div><button className="btn quiet" onClick={() => void load()} disabled={busy}>{busy ? "Checking…" : "Refresh"}</button></div>
      {error && <p role="status">{error} <Link href="/connections">Check connection</Link></p>}
      {saveError && <p role="alert">{saveError}</p>}
      {feed?.stale && <p role="status">Showing the last saved feed. {feed.warning}</p>}
      {feed?.checkedAt && <p className="sub">Last updated {new Date(feed.checkedAt).toLocaleString("en-US", { timeZone: "America/Denver", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} MT · feed updates at most every 30 minutes.</p>}
      {feed && !feed.account && <p>Connect YouTube in <Link href="/connections">Connections</Link> to choose your channels. Saved videos remain available here.</p>}
      {feed?.account && !feed.selected.length && <p><Link href="/connections">Choose your channels</Link> to start your video shelf.</p>}
      <label className="youtube-show-hidden"><input type="checkbox" checked={hidden} onChange={e => setHidden(e.target.checked)} /> Include watched and hidden</label>
      <div className="youtube-videos">{videos.slice(0, limit).map(video => <YouTubeVideoCard key={video.id} video={video} choice={records[video.id]} disabled={!loaded} onChoose={field => choose(video, field)} />)}</div>
      {!videos.length && loaded && !busy && (tab === "saved" ? <p className="sub">Save videos to keep them in your Daymark queue.</p> : !!feed?.selected.length && <p className="sub">You&apos;re caught up with the returned uploads. Include watched and hidden videos, or check again later.</p>)}
      {videos.length > limit && <button className="btn" onClick={() => setLimit(n => n + 6)}>Show more videos</button>}
      {limit > 6 && <button className="btn quiet" onClick={() => setLimit(6)}>Show less</button>}
    </div>
  </section>;
}
