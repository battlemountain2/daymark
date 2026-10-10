"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import type {PrivateFile} from '@/lib/private-files';
import {useFocusSession} from '@/lib/use-focus-session';
import FocusSessionPanel from './FocusSessionPanel';
import {formatFocusTime} from '@/lib/focus-session';
export default function DeskMode({onClose,onRead}:{onClose:()=>void;onRead:()=>void}) {
 const [clock,setClock]=useState<Date|null>(null),[photos,setPhotos]=useState<PrivateFile[]>([]),[photo,setPhoto]=useState(''),[showPhoto,setShowPhoto]=useState(true),[error,setError]=useState('');
 const {session,foreground,actions}=useFocusSession(),compact=useRef<HTMLButtonElement>(null);
 const minimize=useCallback(()=>actions.foreground(false),[actions]);
 useEffect(()=>{
  window.scrollTo({top:0,behavior:'instant'});
  try{setShowPhoto(localStorage.getItem('daymark:desk-photo-hidden')!=='true');setPhoto(localStorage.getItem('daymark:desk-photo')||'');}catch{setError('Desk preferences could not be read on this device.');}
  const tick=()=>setClock(new Date());tick();const interval=setInterval(tick,15000);
  const controller=new AbortController();
  fetch('/api/files',{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>setPhotos((d.files||[]).filter((f:PrivateFile)=>f.type.startsWith('image/')))).catch(()=>{});
  return()=>{clearInterval(interval);controller.abort();};
 },[]);
 function preference(key:string,value:string){try{localStorage.setItem(key,value);setError('');}catch{setError('Desk preference will last while this page stays open.');}}
 const activePhoto=photos.find(p=>p.id===photo)||photos[(clock?.getDate()||0)%photos.length];
 return <section className="zen-desk" data-focus={foreground}>
  <div className="zen-background" inert={foreground}>
   <div className="zen-clock">{clock?.toLocaleTimeString('en-US',{timeZone:'America/Denver',hour:'numeric',minute:'2-digit'}).replace(/\s[AP]M$/,'')||'—'}</div>
   <p className="sub">{clock?.toLocaleDateString('en-US',{timeZone:'America/Denver',weekday:'long',month:'long',day:'numeric'})}</p>
   <div className="zen-timer-line">
    {session&&(session.deadline!==null||session.remaining<session.duration||session.completedAt!==null)&&<button ref={compact} type="button" onClick={()=>actions.foreground(true)}>{session.completedAt?'Session complete':`${formatFocusTime(session.remaining)} · ${session.deadline?'Focusing':'Paused'}`} · Open timer</button>}
    <details className="zen-timer-setup"><summary>{session?.deadline?'Timer settings':'Set a timer'}</summary><FocusSessionPanel compact startButtonRef={session?.deadline?undefined:compact}/></details>
   </div>
   <details className="zen-artwork-settings"><summary>Desk appearance</summary><div className="zen-artwork-controls">
    <label><input type="checkbox" checked={showPhoto} onChange={e=>{setShowPhoto(e.target.checked);preference('daymark:desk-photo-hidden',String(!e.target.checked));}}/> Personal photo</label>
    {photos.length>0&&<label>Artwork<select value={photo} onChange={e=>{setPhoto(e.target.value);preference('daymark:desk-photo',e.target.value);}}><option value="">Daily photo</option>{photos.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
   </div></details>
   {showPhoto&&activePhoto&&<img className="zen-photo" src={`/api/files/${activePhoto.id}`} alt="From your private Favorites collection"/>}
   {session?.task&&<p className="zen-task">{session.task}</p>}
   <div className="reader-toolbar zen-return"><button type="button" onClick={onRead}>Return to reading</button><button type="button" onClick={onClose}>Back to your day</button></div>
   {error&&<p role="status">{error}</p>}
  </div>
  {foreground&&<div className="desk-focus-layer"><FocusSessionPanel onMinimize={minimize} returnFocusRef={compact}/></div>}
 </section>;
}
