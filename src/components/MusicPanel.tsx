"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import type { Music, Track } from "@/lib/music";
import LofiDeck from "@/components/LofiDeck";

/**
 * Recently played, this month's artists, and something new to try.
 *
 * The lead track's sleeve is the visual anchor of the dashboard now that the
 * photo band is gone — it's the one image on the page that's both personal and
 * high resolution, and unlike the old static collection it changes every time
 * he plays something.
 */

const ago = (iso: string | null, now:number|null): string => {
  if (!iso) return "";
  if(now===null)return '';
  const m = (now - Date.parse(iso)) / 60000;
  if (!isFinite(m)) return "";
  if (m < 60) return `${Math.max(1, Math.round(m))}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};

function Sleeve({ track }: { track: Track }) {
  // Cover art comes from third parties — Last.fm's CDN or the Cover Art
  // Archive — and either can 404 for an obscure release. A broken-image icon
  // next to the biggest text on the page is worse than no image at all.
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [track.art]);
  if (!track.art || failed) return <div className="sleeve blank music-art-type" aria-hidden="true"><span>{track.artist}</span></div>;
  return (
    <img className="sleeve" src={track.art} alt={`${track.album ?? track.title} cover`}
      loading="lazy" decoding="async" onError={() => setFailed(true)} />
  );
}

export default function MusicPanel({ promise,compact=false }: { promise: Promise<Music>;compact?:boolean }) {
  const initial = use(promise);
  const [updated, setUpdated] = useState<Music | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const request = useRef<AbortController | null>(null);
  const m = updated ?? initial;
  const refresh = useCallback(async () => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setRefreshing(true);
    setRefreshError("");
    try {
      const response = await fetch("/api/music", { signal: controller.signal });
      if (!response.ok) throw Error();
      const next: Music = await response.json();
      if (next.error && m.recent.length) setRefreshError(next.error);
      else setUpdated(next);
    } catch {
      if (!controller.signal.aborted)
        setRefreshError("Could not refresh listening. Your last tracks are still here.");
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setRefreshing(false);
    }
  }, [m.recent.length]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 5 * 60 * 1000);
    return () => { clearInterval(timer); request.current?.abort(); };
  }, [refresh]);
  const [deckMode, setDeckMode] = useState<"stream" | "lofi">("stream");
  const lead = m.recent[0] ?? null;
  const [clock,setClock]=useState<number|null>(null);
  useEffect(()=>{setClock(Date.now());const t=setInterval(()=>setClock(Date.now()),60000);return()=>clearInterval(t);},[]);
  const rest = m.recent.slice(1, compact ? 3 : 6);

  return (
    <section className={`card span12 musiccard${compact?' music-compact':''}${!lead&&deckMode==='stream'?' music-empty':''}`}>
      <div className="card-head" id="listening">
        <h2>Listening Corner</h2>
        <div className="personal-tabs" aria-label="Listening view">
          <button aria-pressed={deckMode === "stream"} onClick={() => setDeckMode("stream")}>Recent</button>
          <button aria-pressed={deckMode === "lofi"} onClick={() => setDeckMode("lofi")}>Lo-fi</button>
          <button disabled={refreshing} onClick={() => void refresh()} aria-label="Refresh listening">{refreshing ? "Refreshing…" : "↻"}</button>
        </div>
      </div>
      <div className="card-body">
        {deckMode === "lofi" ? (
          <LofiDeck />
        ) : (
          <>
            {refreshError && <p className="sub" role="status">{refreshError}</p>}
            {m.error && <div className="sub">{m.error.startsWith("Set ")?"Connect Last.fm or ListenBrainz to bring your listening history here.":m.error}</div>}
        {/* A working fallback still says which source it fell back from. */}
        {m.note && !m.error && <div className="sub musicnote">{m.note}</div>}

        {lead && (
          <>
            <div className="nowrow">
              <Sleeve track={lead} />
              <div className="nowmeta">
                <div className="now-title">{lead.title}</div>
                <div className="now-artist">{lead.artist}</div>
                {lead.album && <div className="sub now-album">{lead.album}</div>}
                <div className="sub mono now-when">
                  {lead.nowPlaying ? "Playing now" : `Last played ${ago(lead.playedAt,clock)}`}
                </div>
              </div>
            </div>
          </>
        )}

        {rest.length > 0 && (
          <div className="tracklist">
            {rest.map((t, i) => (
              <div className="trackrow" key={`${t.artist}-${t.title}-${i}`}>
                <span className="tr-title">{t.title}</span>
                <span className="tr-artist">{t.artist}</span>
                <span className="tr-when mono">{ago(t.playedAt,clock)}</span>
              </div>
            ))}
          </div>
        )}

        {!compact && m.source && <p className="sub listening-source">From {m.source === "lastfm" ? "Last.fm" : "ListenBrainz"}{m.user ? ` · ${m.user}` : ""}</p>}
        {!compact && m.top.length > 0 && (
          <div className="musicsplit">
            <div>
              <div className="minihead mono">This month</div>
              {m.top.slice(0, 5).map((a) => (
                <div className="miniartist" key={a.name}>
                  <span>{a.name}</span>
                  {a.plays != null && <span className="sub mono">{a.plays}</span>}
                </div>
              ))}
            </div>
            {m.suggestions.length > 0 && (
              <div>
                <div className="minihead mono">Try next</div>
                {m.suggestions.map((s) => (
                  <div className="miniartist" key={s.name}>
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a>
                    ) : (
                      <span>{s.name}</span>
                    )}
                    <span className="sub mono">{s.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
          </>
        )}
      </div>
    </section>
  );
}

export function MusicSkeleton() {
  return (
    <section className="card span12 musiccard">
      <div className="card-head"><h2>Listening</h2><span className="pill mono">loading</span></div>
      <div className="card-body">
        <div className="nowrow">
          <div className="sleeve blank" />
          <div className="nowmeta">
            <span className="bar" style={{ width: "58%", height: 16 }} />
            <span className="bar" style={{ width: "40%" }} />
            <span className="bar sm" style={{ width: "30%" }} />
          </div>
        </div>
      </div>
    </section>
  );
}
