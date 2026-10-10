"use client";
import {useEffect,useSyncExternalStore} from 'react';
import {cloudStorage} from './cloud-storage';
import {FOCUS_SESSION_KEY,newFocusSession,restoreFocusSession,reconcileFocus,startFocus,pauseFocus,nextFocusPhase,phaseSeconds,validFocusDuration,recordFocusCompletion,type FocusPhase,type FocusSession} from './focus-session';
type Snapshot = {session:FocusSession|null;foreground:boolean;error:string};
const empty:Snapshot = {session:null,foreground:false,error:''};
let snapshot = empty;
const listeners = new Set<()=>void>();
let interval:ReturnType<typeof setInterval>|null = null;
let lastSaved = 0;
function emit() { for (const listener of listeners) listener(); }
function persist() {
  lastSaved = Date.now();
  try {
    if (snapshot.session) {
      recordFocusCompletion(snapshot.session,cloudStorage);
      localStorage.setItem(FOCUS_SESSION_KEY,JSON.stringify(snapshot.session));
      lastSaved = Date.now();
    }
    snapshot = {...snapshot,error:''};
  } catch { snapshot = {...snapshot,error:'Timer still works here. Saving is unavailable; keep this page open to retain your session.'}; }
}
function tick() {
  if (!snapshot.session) return;
  const now = Date.now(), before = snapshot.session, session = reconcileFocus(before,now);
  if (session === before) {if(snapshot.error && now - lastSaved >= 15000){persist();emit();}return;}
  const clockChanged = before.deadline !== null && session.deadline === null && session.completedAt === null;
  snapshot = {...snapshot,session};
  const shouldSave = session.deadline === null || now - lastSaved >= 15000;
  if (shouldSave) persist();
  if (clockChanged) snapshot = {...snapshot,error:'Your device clock changed. The timer is paused; resume when ready.'};
  if (session.remaining !== before.remaining || session.deadline !== before.deadline || session.completedAt !== before.completedAt || clockChanged || shouldSave) emit();
}
function readSaved(save = true) {
  try {
    const session = restoreFocusSession(JSON.parse(localStorage.getItem(FOCUS_SESSION_KEY) || 'null'),Date.now()) || newFocusSession(crypto.randomUUID(),Date.now());
    snapshot = {...snapshot,session,foreground:session.deadline !== null,error:''};
    if(save)persist();
  } catch {
    snapshot = {...snapshot,session:newFocusSession(crypto.randomUUID(),Date.now()),error:'Saved timer could not be read. This session will work while the page stays open.'};
  }
  emit();
}
function storageChanged(e:StorageEvent) { if (e.key === FOCUS_SESSION_KEY) readSaved(false); }
function subscribe(listener:()=>void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    interval = setInterval(tick,250);
    window.addEventListener('storage',storageChanged);
    window.addEventListener('focus',tick);
    document.addEventListener('visibilitychange',tick);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      if (snapshot.session) {snapshot = {...snapshot,session:reconcileFocus(snapshot.session,Date.now())};persist();}
      if (interval) clearInterval(interval);
      interval = null;
      window.removeEventListener('storage',storageChanged);
      window.removeEventListener('focus',tick);
      document.removeEventListener('visibilitychange',tick);
    }
  };
}
function update(change:(session:FocusSession)=>FocusSession, foreground = snapshot.foreground) {
  if (!snapshot.session) return;
  snapshot = {...snapshot,session:change(snapshot.session),foreground};
  persist();emit();
}
export const focusActions = {
  start() {update(s=>startFocus(s,Date.now()),true);},
  pause() {update(s=>pauseFocus(s,Date.now()));},
  reset() {update(s=>newFocusSession(crypto.randomUUID(),Date.now(),s.phase,s.duration,s.task,s.completedFocus));},
  choose(phase:FocusPhase,minutes = phaseSeconds(phase)/60) {if (!Number.isInteger(minutes) || !validFocusDuration(minutes*60)) return;update(s=>newFocusSession(crypto.randomUUID(),Date.now(),phase,minutes*60,s.task,s.completedFocus));},
  duration(phase:FocusPhase,seconds:number) {if (!validFocusDuration(seconds)) return;update(s=>newFocusSession(crypto.randomUUID(),Date.now(),phase,seconds,s.task,s.completedFocus));},
  next() {update(s=>{if(s.completedAt === null)return s;const phase=nextFocusPhase(s);return startFocus(newFocusSession(crypto.randomUUID(),Date.now(),phase,phaseSeconds(phase),s.task,s.completedFocus),Date.now());},true);},
  task(task:string) {update(s=>({...s,task:task.slice(0,500)}));},
  foreground(value:boolean) {snapshot={...snapshot,foreground:value};emit();},
};
export function useFocusSession() {
  const current = useSyncExternalStore(subscribe,()=>snapshot,()=>empty);
  useEffect(()=>{if(!snapshot.session)readSaved();else tick();},[]);
  return {...current,actions:focusActions};
}
