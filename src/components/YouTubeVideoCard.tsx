"use client";
import type { YouTubeVideo } from "@/lib/youtube-contract";
export type VideoChoice = YouTubeVideo & { saved?: boolean; watched?: boolean; dismissed?: boolean };

export default function YouTubeVideoCard({ video, choice, disabled, onChoose }: { video: YouTubeVideo; choice?: VideoChoice; disabled: boolean; onChoose: (field: "saved" | "watched" | "dismissed") => void }) {
  return <article className="youtube-video">
    <a href={video.url} target="_blank" rel="noreferrer" className="youtube-video-link">
      {/* Provider thumbnails are validated on the server; images load only as needed. */}
      {video.image ? <img src={video.image} alt="" loading="lazy" width={320} height={180} referrerPolicy="no-referrer" /> : <div className="youtube-art-fallback" aria-hidden="true">▶</div>}
      <h3>{video.title}</h3>
    </a>
    <p className="youtube-video-meta">{video.channel} · {video.minutes == null ? "Duration unavailable" : `${video.minutes} min`} · {new Date(video.published).toLocaleDateString("en-US", { timeZone: "America/Denver", month: "short", day: "numeric" })}</p>
    <div className="youtube-video-actions"><button className="btn quiet" aria-pressed={!!choice?.saved} disabled={disabled} onClick={() => onChoose("saved")}>{choice?.saved ? "Saved ✓" : "Save"}</button><button className="btn quiet" aria-pressed={!!choice?.watched} disabled={disabled} onClick={() => onChoose("watched")}>{choice?.watched ? "Watched ✓" : "Mark watched"}</button><button className="btn quiet" aria-pressed={!!choice?.dismissed} disabled={disabled} onClick={() => onChoose("dismissed")}>{choice?.dismissed ? "Restore" : "Hide"}</button></div>
  </article>;
}
