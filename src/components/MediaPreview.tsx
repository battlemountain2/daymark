"use client";
import { useEffect, useRef, useState } from "react";
import type { Pick } from "@/lib/entertainment";
import type { MediaPreview as Preview } from "@/lib/media-preview";
export function ReleaseArtwork({ provider, id, title, artist }: { provider: string; id: string; title: string; artist?: string }) {
  const [art, setArt] = useState<string | null>(null);
  useEffect(() => {
    const c = new AbortController(); setArt(null);
    if (!["musicbrainz", "tvmaze"].includes(provider)) return () => c.abort();
    fetch(`/api/release-art?${new URLSearchParams({ provider, id })}`, { signal:c.signal }).then(r => r.ok ? r.json() : null).then(d => { if (!c.signal.aborted) setArt(d?.artwork || null); }).catch(() => {});
    return () => c.abort();
  }, [provider,id]);
  return art ? <img className={`radar-art ${provider === "tvmaze" ? "poster" : ""}`} src={art} alt={`${artist || title} ${provider === "tvmaze" ? "poster" : "cover"}`} onError={() => setArt(null)} /> : <div className="radar-art artwork-type"><span className="mono">{provider === "tvmaze" ? "ON SCREEN" : "ON RECORD"}</span><strong>{title}</strong><span>{artist}</span></div>;
}
function Trailer({ id, title, onClose }: { id:string; title:string; onClose:()=>void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className="desk-dialog trailer-dialog" onCancel={onClose} onClick={e => { if(e.target === e.currentTarget) onClose(); }}><div className="desk-dialog-head"><h2>{title} · Trailer</h2><button onClick={onClose} aria-label="Close trailer">✕</button></div><iframe title={`${title} trailer`} src={`https://www.youtube-nocookie.com/embed/${id}`} allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen /><p className="sub"><a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noreferrer">Watch on YouTube ↗</a></p></dialog>;
}
export default function MediaPick({ pick:p, children }: { pick:Pick; children:React.ReactNode }) {
  const [preview,setPreview] = useState<Preview>({ artwork:p.artwork || null });
  const [open,setOpen] = useState(false);
  useEffect(() => {
    const c = new AbortController(); setPreview({ artwork:p.artwork || null }); setOpen(false);
    if (["movie","show","anime"].includes(p.kind)) {
      const year = p.year || (p.kind === "movie" ? p.detail.match(/\b(19|20)\d{2}\b/)?.[0] : undefined);
      fetch(`/api/media-preview?${new URLSearchParams({ title:p.title,kind:p.kind,...(p.imdb?{imdb:p.imdb}:{}),...(year ? {year:String(year)} : {}) })}`, {signal:c.signal}).then(r => r.ok ? r.json() : null).then(d => { if(d && !c.signal.aborted) setPreview({...d,artwork:d.artwork || p.artwork || null}); }).catch(() => {});
    }
    return () => c.abort();
  }, [p.id,p.title,p.kind,p.artwork,p.year,p.detail,p.imdb]);
  return <article className={`media-pick ${p.kind === "game" ? "game-pick" : ""}`}>
    {preview.artwork ? <img src={preview.artwork} alt={`${p.title} ${p.kind === "game" ? "artwork" : "poster"}`} loading="lazy" onError={() => setPreview(prev => ({...prev,artwork:null}))} /> : <div className="media-type-cover"><span className="mono">{p.kind}</span><strong>{p.title}</strong></div>}
    <div>{children}{preview.runtime && <p className="mono sub">{preview.runtime}</p>}{preview.description && <p className="media-synopsis">{preview.description}</p>}<div className="reader-toolbar">{preview.trailer && <button onClick={() => setOpen(true)}>▷ Watch trailer</button>}{preview.source && <a className="sub media-attribution" href={preview.source} target="_blank" rel="noreferrer">Details via Cinemeta · IMDb ↗</a>}</div></div>
    {open && preview.trailer && <Trailer id={preview.trailer} title={p.title} onClose={() => setOpen(false)} />}
  </article>;
}
