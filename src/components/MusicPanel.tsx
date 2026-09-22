"use client";

import { use, useState } from "react";
import type { Music, Track } from "@/lib/music";
import AlbumAccent from "@/components/AlbumAccent";
import LofiDeck from "@/components/LofiDeck";

/**
 * Recently played, this month's artists, and something new to try.
 *
 * The lead track's sleeve is the visual anchor of the dashboard now that the
 * photo band is gone — it's the one image on the page that's both personal and
 * high resolution, and unlike the old static collection it changes every time
 * he plays something.
 */

const ago = (iso: string | null): string => {
  if (!iso) return "";
  const m = (Date.now() - Date.parse(iso)) / 60000;
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
  if (!track.art || failed) return <div className="sleeve blank" aria-hidden="true" />;
  return (
    <img className="sleeve" src={track.art} alt={`${track.album ?? track.title} cover`}
      loading="lazy" decoding="async" onError={() => setFailed(true)} />
  );
}

export default function MusicPanel({ promise }: { promise: Promise<Music> }) {
  const m = use(promise);
  const [deckMode, setDeckMode] = useState<"stream" | "lofi">("stream");
  const lead = m.recent[0] ?? null;
  const rest = m.recent.slice(1, 6);

  return (
    <section className="card span12 musiccard">
      <div className="card-head" id="listening">
        <h2>Listening</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {deckMode === "stream" && (
            <span className={`pill mono ${lead?.nowPlaying ? "live" : ""}`}>
              {m.error ? "unavailable"
                : lead?.nowPlaying ? "playing now"
                : m.totalScrobbles ? `${m.totalScrobbles.toLocaleString()} scrobbles`
                : m.source ?? ""}
            </span>
          )}
          <div className="view-toggle mono">
            <button
              type="button"
              className={`view-toggle-btn ${deckMode === "stream" ? "active" : ""}`}
              onClick={() => setDeckMode("stream")}
            >
              Stream
            </button>
            <span className="view-toggle-sep">/</span>
            <button
              type="button"
              className={`view-toggle-btn ${deckMode === "lofi" ? "active" : ""}`}
              onClick={() => setDeckMode("lofi")}
            >
              🎧 Lo-Fi Deck
            </button>
          </div>
        </div>
      </div>
      <div className="card-body">
        {deckMode === "lofi" ? (
          <LofiDeck />
        ) : (
          <>
            {m.error && <div className="sub">{m.error}</div>}
        {/* A working fallback still says which source it fell back from. */}
        {m.note && !m.error && <div className="sub musicnote">{m.note}</div>}

        {lead && (
          <>
            {lead.art && <AlbumAccent src={lead.art} />}
            <div className="nowrow">
              <Sleeve track={lead} />
              <div className="nowmeta">
                <div className="now-title">{lead.title}</div>
                <div className="now-artist">{lead.artist}</div>
                {lead.album && <div className="sub now-album">{lead.album}</div>}
                <div className="sub mono now-when">
                  {lead.nowPlaying ? "playing now" : ago(lead.playedAt)}
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
                <span className="tr-when mono">{ago(t.playedAt)}</span>
              </div>
            ))}
          </div>
        )}

        {m.top.length > 0 && (
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
