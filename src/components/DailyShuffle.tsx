"use client";
import { use, useEffect, useState } from "react";
import type { Music } from "@/lib/music";
import type { PrivateFile } from "@/lib/private-files";
import albums from "@/data/albums.json";
import { soundtracks } from "@/lib/soundtracks";
import { dayOfYear, pickForDay } from "@/lib/shuffle";
import AlbumArtwork from "@/components/AlbumArtwork";
export default function DailyShuffle({ promise }: { promise: Promise<Music> }) {
  const music = use(promise),
    [slide, setSlide] = useState(0),
    [offset, setOffset] = useState(0),
    [daySeed,setDaySeed] = useState(0),
    [photos, setPhotos] = useState<PrivateFile[]>([]),
    [storage, setStorage] = useState<'local'|'shared'|null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(''),
    [feedback, setFeedback] = useState('');
  useEffect(()=>{const update=()=>setDaySeed(dayOfYear());update();const timer=setInterval(update,60000);return()=>clearInterval(timer);},[]);
  useEffect(() => {
    if(slide!==2||storage!==null)return;
    const controller = new AbortController();
    fetch("/api/files",{signal:controller.signal})
      .then((r) => { if(!r.ok) throw Error(); return r.json(); })
      .then((d) => {
        setStorage(d.storage);
        setPhotos(
          (d.files || []).filter((f: PrivateFile) =>
            f.type.startsWith("image/"),
          ),
        );
      })
      .catch(() => {if(!controller.signal.aborted)setError("Private photos are unavailable right now.");});
    return()=>controller.abort();
  }, [slide,storage]);
  const day = daySeed + offset,
    photo = photos.length ? photos[pickForDay(photos.length, day)] : null;
  const recent = new Set(
    music.recent.map((t) => `${t.artist}:${t.album}`.toLowerCase()),
  );
  const pool = albums.filter(
    (a) => !recent.has(`${a.artist}:${a.album}`.toLowerCase()),
  );
  const album = (pool.length ? pool : albums)[
      pickForDay(pool.length || albums.length, day)
    ],
    ost = soundtracks[pickForDay(soundtracks.length, day)];
  async function upload(f: File) {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
        f.size > 15 * 1024 * 1024
      )
        throw Error(
          "Choose a JPEG, PNG, or WebP under 15 MB. Export HEIC photos as JPEG first.",
        );
      const image = await createImageBitmap(f);
      const canvas = document.createElement("canvas"),
        scale = Math.min(1, 1600 / image.width, 1600 / image.height);
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas
        .getContext("2d")!
        .drawImage(image, 0, 0, canvas.width, canvas.height);
      image.close();
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(Error("Could not prepare photo."))),
          "image/jpeg",
          0.85,
        ),
      );
      const r = await fetch("/api/files", {
        method: "POST",
        headers: {
          "x-file-name": encodeURIComponent(f.name.replace(/\.[^.]+$/, ".jpg")),
          "x-file-course": "Favorites",
        },
        body: blob,
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setStorage(data.storage);
      setPhotos(
        data.files.filter((p: PrivateFile) => p.type.startsWith("image/")),
      );
  }
  async function uploadBatch(files: File[]) {
    if (busy || !files.length) return;
    setBusy(true); setError(''); setFeedback('');
    const failures: string[] = [];
    let ready = 0;
    try {
      if(files.length > 20) throw Error('Choose up to 20 photos at a time. You can add another batch afterward.');
      for (const [index,file] of files.entries()) {
        setProgress(`Preparing ${index + 1} of ${files.length} · ${file.name}`);
        try { await upload(file); ready++; }
        catch(e) { failures.push(`${file.name}: ${e instanceof Error ? e.message : 'Could not store photo.'}`); }
      }
      if(ready) setFeedback(`${ready} photo${ready === 1 ? '' : 's'} ready in your private collection.`);
      if(failures.length) setError(failures.join(' '));
    } catch(e) {
      setError(e instanceof Error ? e.message : 'Could not store photos.');
    } finally {
      setBusy(false); setProgress('');
    }
  }
  function move(next:number) { setSlide((next+3)%3); }
  return (
    <section className="card daily-shuffle">
      <div className="card-head">
        <h2>Daily shuffle</h2>
      </div>
      <div className="card-body">
        <div className="personal-tabs">
          {["Rediscover", "Soundtrack", "Your photos"].map((s, i) => (
            <button
              key={s}
              aria-pressed={slide === i}
              onClick={() => setSlide(i)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="shuffle-stage" aria-live="polite" role="region" aria-label="Daily shuffle picks" tabIndex={0} onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key==="ArrowRight"){e.preventDefault();move(slide+1);}if(e.key==="ArrowLeft"){e.preventDefault();move(slide-1);}}}>
          {slide < 2 ? (
            <div className="shuffle-feature">
              <AlbumArtwork
                key={slide === 0 ? `${album.artist}:${album.album}` : ost.catalogId}
                artist={slide === 0 ? album.artist : ost.artist}
                album={slide === 0 ? album.album : ost.album}
                motif={slide === 0 ? undefined : ost.motif}
                design={slide === 0 ? undefined : ost.design}
              />
              <div>
                <h3>{slide === 0 ? album.album : ost.title}</h3>
                <p>{slide === 0 ? album.artist : ost.artist}</p>
                {slide===0&&<a className="shuffle-listen" href={`https://music.apple.com/us/search?term=${encodeURIComponent(`${album.artist} ${album.album}`)}`} target="_blank" rel="noreferrer">Find on Apple Music ↗</a>}
                {slide === 1 && <a className="shuffle-listen" href={ost.source} target="_blank" rel="noreferrer">Listen on Apple Music ↗</a>}
              </div>
            </div>
          ) : (
            <div className="shuffle-photo-frame">
              {photo ? (
                <img
                  className="shuffle-photo"
                  src={`/api/files/${photo.id}`}
                  alt={photo.name}
                  decoding="async"
                />
              ) : (
                <p className="sub">Add your first favorite photo below.</p>
              )}
            </div>
          )}
        </div>
        <div className="shuffle-footer">
          <div className="shuffle-controls">
            <span className="shuffle-count mono" aria-label={`Card ${slide+1} of 3`}>{String(slide+1).padStart(2,"0")} / 03</span>
            <button aria-label="Previous shuffle card" onClick={() => move(slide-1)}>←</button>
            <button aria-label="Next shuffle card" onClick={() => move(slide+1)}>→</button>
            <button onClick={() => setOffset(n=>n+1)}>Shuffle again</button>
          </div>
          {slide === 2 && <details className="shuffle-photo-settings">
            <summary>Photos{photos.length ? ` · ${photos.length}` : ''}{storage === 'local' ? ' · Local preview' : ''}</summary>
            <div>
              {storage==='local' && <p className="sub">Saved in this preview only. Import on the live site for access across devices.</p>}
              <label className="file-button">
                {busy ? "Storing photos…" : "Add photos"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy}
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length) void uploadBatch(files);
                    e.target.value = "";
                  }}
                />
              </label>
              <p className="sub">Up to 20 JPEG, PNG, or WebP photos. Export HEIC as JPEG first.</p>
            </div>
          </details>}
        </div>
        {(progress || feedback) && <p role="status" className="sub">{progress || feedback}</p>}
        {error && <p role="alert">{error}</p>}
      </div>
    </section>
  );
}
