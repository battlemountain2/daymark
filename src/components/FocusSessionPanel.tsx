"use client";
import {useEffect,useRef,useState,useId,type RefObject} from 'react';
import {useFocusSession} from '@/lib/use-focus-session';
import {soundscape,type SoundscapeType} from '@/lib/soundscape';
import {formatFocusTime,nextFocusPhase,phaseName,validFocusDuration} from '@/lib/focus-session';

export default function FocusSessionPanel({onMinimize,returnFocusRef,startButtonRef,compact=false}:{onMinimize?:()=>void;returnFocusRef?:RefObject<HTMLButtonElement|null>;startButtonRef?:RefObject<HTMLButtonElement|null>;compact?:boolean}) {
 const {session,actions,error}=useFocusSession(),panel=useRef<HTMLDivElement>(null),ownPrimary=useRef<HTMLButtonElement>(null);
 const primary=startButtonRef||ownPrimary,titleId=useId();
 const [minutes,setMinutes]=useState('25'),[seconds,setSeconds]=useState('0');
 const [audio,setAudio]=useState<SoundscapeType>('off'),[volume,setVolume]=useState(0.25);
 const duration=session?.duration,id=session?.id;
 useEffect(()=>{if(duration!==undefined){setMinutes(String(Math.floor(duration/60)));setSeconds(String(duration%60));}},[duration,id]);
 useEffect(()=>{if(compact)return;if(audio==='off')soundscape?.stop();else soundscape?.play(audio,volume);return()=>soundscape?.stop();},[audio,volume,compact]);
 useEffect(()=>{
  if(!onMinimize)return;
  const previous=returnFocusRef?.current || document.activeElement as HTMLElement|null;
  primary.current?.focus({preventScroll:true});
  const key=(e:KeyboardEvent)=>{
   if(e.key==='Escape'){e.preventDefault();onMinimize();return;}
   if(e.key!=='Tab'||!panel.current)return;
   const visible=Array.from(panel.current.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]')).filter(el=>el.getClientRects().length);
   const first=visible[0],last=visible[visible.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  };
  const overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  document.addEventListener('keydown',key);
  return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',key);previous?.focus({preventScroll:true});};
 },[onMinimize,returnFocusRef,primary]);
 if(!session)return null;
 const running=session.deadline!==null,complete=session.completedAt!==null,next=nextFocusPhase(session);
 const draft=Number(minutes)*60+Number(seconds);
 const valid=minutes!==''&&seconds!==''&&Number.isInteger(Number(minutes))&&Number.isInteger(Number(seconds))&&Number(seconds)>=0&&Number(seconds)<60&&validFocusDuration(draft);
 const changed=valid&&draft!==session.duration;
 const display=changed&&!running?draft:session.remaining;
 const start=()=>{
  if(running){actions.pause();return;}
  if(!valid)return;
  if(changed){actions.duration(session.phase,draft);actions.start();}
  else if(complete)actions.next();
  else actions.start();
 };
 return <div ref={panel} className={onMinimize?'desk-focus-panel':compact?'focus-session-inline focus-session-compact':'focus-session-inline'} role={onMinimize?'dialog':undefined} aria-modal={onMinimize?true:undefined} aria-labelledby={titleId}>
  {onMinimize&&<div className="focus-panel-top"><span className="mono">Daymark / Focus</span><button type="button" onClick={onMinimize}>Back to desk ↗</button></div>}
  <form className="focus-timer-form" onSubmit={e=>{e.preventDefault();start();}}>
   <h2 id={titleId} className={compact?'sr-only':''}>{complete?'A moment well spent.':session.task||'One thing at a time.'}</h2>
   <div className="focus-phases" aria-label="Timer phase">{(['focus','shortBreak','longBreak'] as const).map(phase=><button key={phase} type="button" disabled={running} aria-pressed={session.phase===phase} onClick={()=>actions.choose(phase)}>{phaseName(phase)}</button>)}</div>
   <div className="focus-time-display" data-hours={display>=3600}><span className="focus-digits" role="timer" aria-live="off" aria-label={`${phaseName(session.phase)} time remaining`}>{formatFocusTime(display)}</span><span className="focus-state">{complete&&!changed?'Complete':running?(session.phase==='focus'?'Focusing':'Taking a break'):session.remaining<session.duration&&!changed?'Paused':'Your time, your pace'}</span></div>
   {!compact&&<div className="focus-progress" aria-hidden="true"><span style={{width:`${Math.max(0,Math.min(100,100*(1-session.remaining/session.duration)))}%`}}/></div>}
   {!running&&<><div className="focus-duration"><label>Minutes<input type="number" inputMode="numeric" min="0" max="1440" step="1" required disabled={running} value={minutes} onChange={e=>setMinutes(e.target.value)}/></label><span aria-hidden="true">:</span><label>Seconds<input type="number" inputMode="numeric" min="0" max="59" step="1" required disabled={running} value={seconds} onChange={e=>setSeconds(e.target.value)}/></label></div>
   {!valid&&!running&&<p className="focus-next" role="status">Choose between 1 second and 24 hours.</p>}
   <div className="focus-quick-times" aria-label="Quick durations">{[15,25,45,60].map(m=><button type="button" key={m} disabled={running} aria-pressed={valid&&draft===m*60} onClick={()=>{setMinutes(String(m));setSeconds('0');}}>{m} min</button>)}</div></>}
   <div className="focus-actions"><button ref={primary} type="submit" disabled={!running&&!valid} className="focus-primary">{running?'Pause':complete&&!changed?`Start ${phaseName(next).toLowerCase()}`:session.remaining<session.duration&&!changed?'Resume':'Start'}</button><button type="button" onClick={actions.reset}>Reset</button>{compact&&running&&<button type="button" onClick={()=>actions.foreground(true)}>Open Zen timer ↗</button>}</div>
  </form>
  {complete&&<p role="status" className="focus-next">{phaseName(next)} starts when you choose.</p>}
  {!compact&&<div className="focus-extras"><label className="focus-task"><span className="sr-only">Focusing on</span><input value={session.task} maxLength={500} onChange={e=>actions.task(e.target.value)} placeholder="What are you focusing on? (optional)"/></label><div className="focus-audio-controls"><button type="button" onClick={()=>setAudio((["off","rain","pink","lofi"] as SoundscapeType[])[(["off","rain","pink","lofi"] as SoundscapeType[]).indexOf(audio)+1]||'off')}>Sound: {audio==='off'?'Off':audio==='pink'?'Pink noise':audio==='lofi'?'Vinyl':'Rain'}</button>{audio!=='off'&&<input aria-label="Ambient volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={e=>setVolume(Number(e.target.value))}/>}<span className="focus-cycle mono">{session.completedFocus} {session.completedFocus===1?'session':'sessions'}</span></div></div>}
  {error&&<p className="focus-next" role="status">{error}</p>}
 </div>;
}
