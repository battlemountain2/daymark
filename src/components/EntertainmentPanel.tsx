"use client";
import {useEffect,useRef,useState} from 'react';
import MediaPick from '@/components/MediaPreview';
import type {Music} from '@/lib/music';
import type {Entertainment,Pick} from '@/lib/entertainment';
import {usePersonalRecords} from '@/lib/use-personal-records';
import {contextPool,inPastWeek,type SavedMedia} from '@/lib/media-context';
import {dayOfYear,pickForDay} from '@/lib/shuffle';
export default function EntertainmentPanel({musicPromise}:{musicPromise:Promise<Music>}) {
 const saved=usePersonalRecords<SavedMedia>('daymark:backlog'),shelves=usePersonalRecords<{name:string}>('daymark:shelves'),history=usePersonalRecords<Pick>('daymark:media-history');
 const positionPrefs=usePersonalRecords<{id:string}>('daymark:layout');
 const writeHistory=history.write;
 const [albumChoices,setAlbumChoices]=useState<Pick[]>([]),[data,setData]=useState<Entertainment|null>(null),[error,setError]=useState(''),[kind,setKind]=useState('movie'),[budget,setBudget]=useState(0),[company,setCompany]=useState('either'),[shelf,setShelf]=useState(''),[roulette,setRoulette]=useState(false),[day,setDay]=useState(0);
 const touch=useRef<number|null>(null);
 useEffect(()=>{setDay(dayOfYear());let alive=true;void Promise.resolve(musicPromise).then(m=>{if(!alive)return;setAlbumChoices(Array.from(new Map(m.recent.filter(t=>t.album).map(t=>[`album:${t.artist}:${t.album}`,{id:`album:${t.artist}:${t.album}`,title:t.album!,kind:'album',url:t.url||'https://www.last.fm',detail:t.artist,artwork:t.art||undefined}])).values()));for(const t of m.recent){if(!t.playedAt)continue;const id=`listen:${t.playedAt}:${t.artist}:${t.title}`;writeHistory(id,{id,title:t.title,kind:'Listening',url:t.url||'https://www.last.fm',detail:t.artist,artwork:t.art||undefined,occurredAt:t.playedAt});}}).catch(()=>{});return()=>{alive=false;};},[musicPromise,writeHistory]);
 useEffect(()=>{for(const p of data?.watching||[])if(p.occurredAt)writeHistory(`${p.id}:${p.occurredAt}`,p);},[data,writeHistory]);
 useEffect(()=>{const c=new AbortController();fetch('/api/entertainment',{signal:c.signal}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(setData).catch(e=>{if(e.name!=='AbortError')setError('Could not load your collection. Refresh to try again.');});return()=>c.abort();},[]);
 const collected=Object.values(saved.records);
 const library:SavedMedia[]=[...collected,...(kind==='movie'?(roulette?[]:data?.films||[]):kind==='game'?(data?.games||[]).filter(g=>!roulette||g.detail==='Unplayed in your library'):kind==='show'?data?.watching||[]:kind==='album'?albumChoices:[])];
 const pool=contextPool(library,{kind,budget,company,shelf});
 const remembered=pool.findIndex(p=>p.id===positionPrefs.records[`media-pick:${kind}`]?.id);
 const position=remembered>=0?remembered:pool.length?pickForDay(pool.length,day):0;
 const current=pool[position],next=pool.length>1?pool[(position+1)%pool.length]:null;
 function move(delta:number){if(!pool.length)return;const p=pool[(position+delta+pool.length)%pool.length];positionPrefs.write(`media-pick:${kind}`,{id:p.id});}
 function add(p:Pick){saved.write(p.id,{...p,added:new Date().toISOString(),shelf:shelf||undefined});}
 function pickContent(p:Pick){return <><h3>{p.title}</h3><p className="sub">{p.detail}</p>{'minutes' in p&&!!p.minutes&&<p className="sub">{String(p.minutes)} min</p>}<div className="reader-toolbar"><a href={p.url} target="_blank" rel="noreferrer">Open source ↗</a>{!saved.records[p.id]&&<button type="button" onClick={()=>add(p)}>Save to a shelf</button>}</div></>;}
 const watched=Object.values(history.records).filter(p=>inPastWeek(p.occurredAt)).sort((a,b)=>(b.occurredAt||'').localeCompare(a.occurredAt||''));
 const recentFinished=collected.filter(p=>inPastWeek(p.finished));
 return <section className="card entertainment-card"><div className="card-head"><h2>Your media room</h2></div><div className="card-body">
  <div className="media-feature-head"><h3>{roulette?'Backlog roulette':'Tonight’s pick'}</h3><details className="media-pick-filters"><summary>Filter picks</summary><div className="media-context">
   <label>Pick from<select value={kind} onChange={e=>{setKind(e.target.value);}}><option value="movie">Films</option><option value="game">Games</option><option value="show">Shows / anime</option><option value="album">Albums</option></select></label>
   <label>Time available<select value={budget} onChange={e=>{setBudget(Number(e.target.value));}}><option value={0}>Open evening</option><option value={30}>30 minutes</option><option value={60}>An hour</option><option value={120}>Two hours</option></select></label>
   <label>Company<select value={company} onChange={e=>{setCompany(e.target.value);}}><option value="either">Either</option><option value="solo">Solo</option><option value="friends">With friends</option></select></label>
   <label>Shelf<select value={shelf} onChange={e=>{setShelf(e.target.value);}}><option value="">All shelves</option>{Object.entries(shelves.records).map(([id,s])=><option key={id} value={id}>{s.name}</option>)}</select></label>
  </div></details></div>
  <div className="media-feature-frame" role="region" aria-label="Tonight’s picks" aria-roledescription="carousel" tabIndex={0} onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key==='ArrowRight'){e.preventDefault();move(1);}if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}}} onTouchStart={e=>{touch.current=e.touches[0].clientX;}} onTouchEnd={e=>{if(touch.current===null)return;const delta=touch.current-e.changedTouches[0].clientX;touch.current=null;if(Math.abs(delta)>55)move(delta>0?1:-1);}}>
   {current?<div className="media-feature-track"><div className="media-feature-slide"><MediaPick key={current.id} pick={current}>{pickContent(current)}</MediaPick></div>{next&&<div className="media-feature-peek" aria-hidden="true" inert><MediaPick key={next.id} pick={next}><h3>{next.title}</h3></MediaPick></div>}</div>:<p className="sub">{!data&&!error?'Loading your collection…':budget?'No picks with a saved length fit. Try a longer window or add a runtime.':roulette?'Save films or find unplayed games for your backlog.':'No picks match these filters. Try another type or shelf.'}</p>}
  </div>
  <div className="media-carousel-controls"><button type="button" aria-label="Previous media pick" disabled={pool.length<2} onClick={()=>move(-1)}>←</button><span className="mono" aria-live="polite">{pool.length?`${position+1} / ${pool.length}`:'0 picks'}</span><button type="button" aria-label="Next media pick" disabled={pool.length<2} onClick={()=>move(1)}>→</button><button type="button" aria-pressed={roulette} onClick={()=>{setRoulette(!roulette);}}>{roulette?'All picks':'Backlog roulette'}</button></div>
  <section className="media-room-section"><h3>Continue playing</h3>{data?.recent.length?<div className="media-art-row">{data.recent.map(p=><MediaPick key={p.id} pick={p}>{pickContent(p)}</MediaPick>)}</div>:<p className="sub">{data?'No recent games returned by Steam.':'Loading recent games…'}</p>}</section>
  <section className="media-room-section"><h3>Continue watching</h3>{data?.watching.length?<><p className="sub">Last watched episodes · Trakt</p><div className="media-art-row">{data.watching.map(p=><MediaPick key={p.id} pick={p}>{pickContent(p)}</MediaPick>)}</div></>:<p className="sub">{data?'No recent viewing returned by Trakt.':'Loading recent viewing…'}</p>}</section>
  <section className="media-room-section"><h3>Personal shelves</h3>{Object.entries(shelves.records).map(([id,s])=><div className="media-shelf" key={id}><h4>{s.name}</h4><div className="media-art-row">{collected.filter(p=>p.shelf===id&&!p.finished).map(p=><MediaPick key={p.id} pick={p}>{pickContent(p)}</MediaPick>)}</div>{!collected.some(p=>p.shelf===id&&!p.finished)&&<p className="sub">No saved items here yet.</p>}</div>)}
   <details className="personal-setup"><summary>{Object.keys(shelves.records).length?'Add a shelf':'Create your first shelf'}</summary><form className="reader-toolbar" onSubmit={e=>{e.preventDefault();const name=String(new FormData(e.currentTarget).get('name')||'').trim();if(name)shelves.write(crypto.randomUUID(),{name});e.currentTarget.reset();}}><input name="name" aria-label="New shelf name" placeholder="Comfort films, anime to start…" required maxLength={80}/><button>Add shelf</button></form></details>
  </section>
  <details className="personal-setup media-week"><summary>Week in Media · {watched.length+recentFinished.length} recorded</summary><div className="media-week-list">{[...watched,...recentFinished].map(p=><a className="personal-item" key={`${p.id}:${p.occurredAt||('finished' in p?p.finished:'')}`} href={p.url} target="_blank" rel="noreferrer"><strong>{p.title}</strong><span className="sub">{p.detail}</span></a>)}{!watched.length&&!recentFinished.length&&<p className="sub">Nothing recorded this week yet.</p>}</div><p className="sub">Saved listening, reported viewing, and items marked finished. Steam’s two-week playtime is excluded.</p></details>
        <details className="personal-setup">
          <summary>Manage your collection</summary>
          <form
            className="release-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget),
                url = String(f.get("url")).trim();
              try {
                if (!["http:", "https:"].includes(new URL(url).protocol))
                  throw Error();
              } catch {
                setError("Enter a valid source link.");
                return;
              }
              const title = String(f.get("title")).trim();
              if (!title) return;
              const id = crypto.randomUUID();
              saved.write(id, {
                id,
                title,
                url,
                kind: String(f.get("kind")),
                detail: "Saved by you",
                minutes: Number(f.get("minutes")) || undefined,
                company: String(f.get("company")) as SavedMedia["company"],
                shelf: String(f.get("shelf")) || undefined,
                added: new Date().toISOString(),
              });
              e.currentTarget.reset();
            }}
          >
            <label>
              Title
              <input name="title" required maxLength={160} />
            </label>
            <label>
              Type
              <select name="kind">
                <option value="movie">Film</option>
                <option value="game">Game</option>
                <option value="show">Show / anime</option>
                <option value="album">Album</option>
              </select>
            </label>
            <label>
              Source link
              <input name="url" type="url" required maxLength={1000} />
            </label>
            <label>
              Runtime / game session minutes
              <input name="minutes" type="number" min={1} max={1440} />
            </label>
            <label>
              Company
              <select name="company">
                <option value="either">Either</option>
                <option value="solo">Solo</option>
                <option value="friends">With friends</option>
              </select>
            </label>
            <label>
              Shelf
              <select name="shelf">
                <option value="">Backlog</option>
                {Object.entries(shelves.records).map(([id, s]) => (
                  <option key={id} value={id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <button>Save item</button>
          </form>
          {Object.entries(saved.records).map(([id, p]) => (
            <div className="collection-row" key={id}>
              <strong>{p.title}</strong>
              <label>
                Shelf
                <select
                  value={p.shelf || ""}
                  onChange={(e) =>
                    saved.write(id, { ...p, shelf: e.target.value })
                  }
                >
                  <option value="">Backlog</option>
                  {Object.entries(shelves.records).map(([key, s]) => (
                    <option key={key} value={key}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Minutes
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={p.minutes || ""}
                  onChange={(e) =>
                    saved.write(id, {
                      ...p,
                      minutes: Number(e.target.value) || undefined,
                    })
                  }
                />
              </label>
              <button
                onClick={() =>
                  saved.write(id, {
                    ...p,
                    finished: p.finished ? undefined : new Date().toISOString(),
                  })
                }
              >
                {p.finished ? "Return to backlog" : "Mark finished"}
              </button>
            </div>
          ))}
        </details>

 {!!data?.notes.length&&<details className="personal-setup"><summary>Connection status</summary>{data.notes.map(n=><p className="sub" key={n}>{n}</p>)}</details>}
 {(error||saved.error||shelves.error)&&<p role="status">{error||saved.error||shelves.error}</p>}
 </div></section>;
}
