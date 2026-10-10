"use client";
import Link from "next/link";
import { ReleaseArtwork } from "@/components/MediaPreview";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePersonalRecords } from "@/lib/use-personal-records";
import type { Follow, Release } from "@/lib/release-radar";
import type {Music} from '@/lib/music';
import {syncCloud,getCloudStatus} from "@/lib/cloud-storage";

export default function ReleaseRadar({musicPromise,space='media',onBrowse}:{musicPromise?:Promise<Music>;space?:string;onBrowse?:()=>void}) {
  const releases = usePersonalRecords<Release>("daymark:releases"),
    follows = usePersonalRecords<Follow>("daymark:radar-follows"),
    states = usePersonalRecords<{ dismissed?: boolean; snooze?: string; missing?:boolean; checkedAt?:string; failed?:boolean; partial?:boolean }>(
      "daymark:radar-state",
    );
  const [suggested,setSuggested]=useState<{name:string;provider:'musicbrainz'|'tvmaze'}[]>([]);
  const searchForm=useRef<HTMLFormElement>(null);
  useEffect(()=>{let alive=true;void Promise.resolve(musicPromise).then(m=>{if(alive&&m)setSuggested(prev=>[...Array.from(new Set([...m.top.map(a=>a.name),...m.recent.map(t=>t.artist)])).slice(0,5).map(name=>({name,provider:'musicbrainz' as const})),...prev.filter(p=>p.provider==='tvmaze')]);}).catch(()=>{});fetch('/api/entertainment').then(r=>r.ok?r.json():null).then(d=>{if(alive&&d)setSuggested(prev=>[...prev.filter(p=>p.provider==='musicbrainz'),...Array.from(new Set<string>((d.watching||[]).map((p:{title:string})=>p.title))).slice(0,4).map(name=>({name,provider:'tvmaze' as const}))]);}).catch(()=>{});return()=>{alive=false;};},[musicPromise]);
  const [index, setIndex] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [matches, setMatches] = useState<Follow[]>([]),
    [filter, setFilter] = useState("upcoming"),
    [checked, setChecked] = useState("");
  const signature = Object.keys(follows.records).sort().join(",");

  const requestBusy=useRef(false);
  const refresh = useCallback(async (force=false) => {
    if(!signature || requestBusy.current) return;
    requestBusy.current=true;
    setBusy(true);setError("");
    try {
      await syncCloud();
      if(!["synced","conflict"].includes(getCloudStatus().state)||getCloudStatus().pending>0)throw Error("Sync your saved follows before checking releases.");
      const r=await fetch('/api/radar/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({force})});
      if(!r.ok)throw Error(r.status===401?"Sign in to refresh releases.":"Could not refresh releases. Try again.");
      const result=await r.json();
      await syncCloud();
      if(result.checked)setChecked(new Date().toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}));
      if(result.failed)setError(`${result.failed} source${result.failed===1?'':'s'} could not refresh. Saved dates remain available.`);
      if(result.remaining)setError(`${result.remaining} more follows will be checked on the next run.`);
    }catch(e){setError(e instanceof Error?e.message:"Could not refresh releases.");}
    finally{requestBusy.current=false;setBusy(false);}
  },[signature]);
  const autoChecked=useRef<string>("");
  useEffect(()=>{
    const run=()=>{const status=getCloudStatus();if(signature&&signature!==autoChecked.current&&["synced","conflict"].includes(status.state)&&status.pending===0){autoChecked.current=signature;void refresh();}};
    run();window.addEventListener("daymark:sync-status",run);
    return()=>window.removeEventListener("daymark:sync-status",run);
  },[signature,refresh]);
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Denver",
  });
  const oldest = new Date(Date.now() - 14 * 86400000)
    .toISOString()
    .slice(0, 10);
  const items = Object.values(releases.records)
    .filter((r) => {
      const state = states.records[r.id];
      if (filter === "hidden")
        return state?.dismissed || state?.missing || (state?.snooze && state.snooze > today);
      if (state?.missing || state?.dismissed || (state?.snooze && state.snooze > today))
        return false;
      return filter === "upcoming"
        ? r.date >= today
        : r.date <= today && r.date >= oldest;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  const current = items[index % Math.max(1, items.length)],
    follow = current?.follow ? follows.records[current.follow] : null;
  return (
    <section className="card release-radar">
      <div className="card-head">
        <h2>Release radar</h2>
        <button disabled={busy || !signature} onClick={() => void refresh(true)}>
          {busy ? "Checking…" : "Refresh follows"}
        </button>
      </div>
      <div className="card-body">
        <div className="personal-tabs">
          {[
            ["upcoming", "Upcoming"],
            ["out", "Out now"],
            ["hidden", "Hidden / snoozed"],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={filter === id}
              onClick={() => {
                setFilter(id);
                setIndex(0);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {current ? (
          <div className="release-slide">
            <ReleaseArtwork key={current.id} provider={current.follow?.split(":")[0] || "manual"} id={current.follow?.startsWith("tvmaze:") ? current.follow.split(":")[1] : current.artworkId || current.id.replace("musicbrainz:", "")} title={current.title} artist={follow?.name} />
            <div>
              <span className="mono sub">
                {current.kind} · {current.date}
              </span>
              {follow && <p className="sub">{follow.name}</p>}
              {states.records[current.id]?.missing&&<p className="sub">No longer returned by the source. Check its current date.</p>}
              <h3>
                <a href={current.url} target="_blank" rel="noreferrer">
                  {current.title} ↗
                </a>
              </h3>
              <p className="sub">
                {current.source || "Saved by you"}
              </p>
            </div>
            <div className="shuffle-controls">
              <button
                aria-label="Previous release"
                onClick={() =>
                  setIndex((index + items.length - 1) % items.length)
                }
              >
                ←
              </button>
              <span>
                {(index % items.length) + 1}/{items.length}
              </span>
              <button
                aria-label="Next release"
                onClick={() => setIndex(index + 1)}
              >
                →
              </button>
              {filter === "hidden" && !states.records[current.id]?.missing ? (
                <button onClick={() => states.write(current.id, null)}>
                  Restore
                </button>
              ) : (
                <>
                  <button
                    onClick={() =>
                      states.write(current.id, { ...states.records[current.id], dismissed: true })
                    }
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() =>
                      states.write(current.id, {
                        ...states.records[current.id], snooze: new Date(
                          Date.now() + 7 * 86400000,
                        ).toLocaleDateString("en-CA", {
                          timeZone: "America/Denver",
                        }),
                      })
                    }
                  >
                    Snooze 7 days
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <p className="sub">
            {filter === "hidden"
              ? "Nothing tucked away."
              : "No dated releases here yet. Follow an artist or show, or save a confirmed date."}
          </p>
        )}
        {space === "main" && <Link className="news-all-link" href="/?space=media#releases" onClick={e=>{if(onBrowse){e.preventDefault();onBrowse();}}}>Manage follows in Media ↗</Link>}
        <details className="personal-setup">
          <summary>Follow artists & shows</summary>
          <p className="sub">
            Choose the correct match before following. Dates are checked daily and when you
            refresh this panel; announcements without exact dates stay out of your
            calendar.
          </p>
          {suggested.length>0&&<div className="radar-suggested"><p className="sub">From your listening and viewing</p>{suggested.map(s=><button type="button" key={`${s.provider}:${s.name}`} onClick={()=>{const form=searchForm.current;if(!form)return;(form.elements.namedItem('provider') as HTMLSelectElement).value=s.provider;(form.elements.namedItem('q') as HTMLInputElement).value=s.name;form.requestSubmit();}}>Find {s.name}</button>)}</div>}
          <form
            ref={searchForm}
            className="release-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setBusy(true);
              setError("");
              try {
                const r = await fetch(
                    `/api/radar?provider=${f.get("provider")}&q=${encodeURIComponent(String(f.get("q")))}`,
                  ),
                  d = await r.json();
                if (!r.ok) throw Error(d.error);
                setMatches(d.matches);
                if (!d.matches.length)
                  setError("No matching artists or shows found.");
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Search unavailable.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Source
              <select name="provider">
                <option value="musicbrainz">MusicBrainz · artists</option>
                <option value="tvmaze">TVmaze · shows / anime</option>
              </select>
            </label>
            <label>
              Name
              <input name="q" required minLength={2} maxLength={100} />
            </label>
            <button disabled={busy}>Find matches</button>
          </form>
          {matches.map((m) => (
            <div className="collection-row" key={`${m.provider}:${m.id}`}>
              <div>
                <strong>{m.name}</strong>
                <p className="sub">{m.detail}</p>
              </div>
              <a href={m.url} target="_blank" rel="noreferrer">
                Check source ↗
              </a>
              <button
                disabled={!!follows.records[`${m.provider}:${m.id}`]}
                onClick={() => follows.write(`${m.provider}:${m.id}`, m)}
              >
                Follow this match
              </button>
            </div>
          ))}
          {Object.entries(follows.records).map(([key, f]) => (
            <div className="collection-row" key={key}>
              <div><span>{f.name}</span><p className="sub">{states.records[`check:${key}`]?.checkedAt ? `Last checked ${new Date(states.records[`check:${key}`].checkedAt!).toLocaleString([], {month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}` : "Not checked yet"}{states.records[`check:${key}`]?.failed ? " · refresh unavailable" : states.records[`check:${key}`]?.partial ? " · partial results; saved dates retained" : ""}</p></div>
              <button onClick={() => follows.write(key, null)}>Unfollow</button>
            </div>
          ))}
          <p className="sub">
            Music data:{" "}
            <a href="https://musicbrainz.org" target="_blank" rel="noreferrer">
              MusicBrainz
            </a>
            . Show data:{" "}
            <a href="https://www.tvmaze.com" target="_blank" rel="noreferrer">
              TVmaze
            </a>{" "}
            ·{" "}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY-SA
            </a>
            . Games and films use your confirmed dates below.
          </p>
        </details>
        <details className="personal-setup">
          <summary>Add a confirmed date</summary>
          <form
            className="release-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget),
                url = String(f.get("url"));
              try {
                if (!["http:", "https:"].includes(new URL(url).protocol))
                  throw Error();
              } catch {
                setError("Enter a valid source URL.");
                return;
              }
              const id = crypto.randomUUID();
              releases.write(id, {
                id,
                title: String(f.get("title")).trim(),
                date: String(f.get("date")),
                kind: String(f.get("kind")),
                url,
              });
              e.currentTarget.reset();
            }}
          >
            <label>
              Title
              <input name="title" required maxLength={160} />
            </label>
            <label>
              Date
              <input name="date" type="date" required />
            </label>
            <label>
              Type
              <select name="kind">
                <option>Game</option>
                <option>Album</option>
                <option>Show</option>
                <option>Anime</option>
                <option>Film</option>
              </select>
            </label>
            <label>
              Source link
              <input name="url" type="url" required maxLength={1000} />
            </label>
            <button>Save date</button>
          </form>
        </details>
        {checked && <p className="mono sub">Checked {checked}</p>}
        {(error || releases.error || follows.error || states.error) && (
          <p role="status">
            {error || releases.error || follows.error || states.error}
          </p>
        )}
      </div>
    </section>
  );
}
