export type FocusPhase = 'focus' | 'shortBreak' | 'longBreak';
export type FocusTarget = {kind:'project'|'task';id:string;title:string};
export type FocusSession = {
  version: 2; id: string; phase: FocusPhase; duration: number; remaining: number;
  deadline: number | null; observedAt: number; completedAt: number | null;
  completedFocus: number; task: string;
  target?: FocusTarget;
};
export const FOCUS_SESSION_KEY = 'daymark:focus-session';
export const phaseName = (phase: FocusPhase) => phase === 'focus' ? 'Focus' : phase === 'shortBreak' ? 'Short break' : 'Long break';
export const phaseSeconds = (phase: FocusPhase) => phase === 'focus' ? 1500 : phase === 'shortBreak' ? 300 : 900;
export function validFocusDuration(seconds: number): boolean {
  return Number.isInteger(seconds) && seconds >= 1 && seconds <= 86400;
}
export function formatFocusTime(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60), tail = String(total % 60).padStart(2, '0');
  return minutes >= 60 ? `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${tail}` : `${String(minutes).padStart(2, '0')}:${tail}`;
}
export function newFocusSession(id: string, now: number, phase: FocusPhase = 'focus', duration = phaseSeconds(phase), task = '', completedFocus = 0): FocusSession {
  return {version:2,id,phase,duration,remaining:duration,deadline:null,observedAt:now,completedAt:null,completedFocus,task};
}
export function remainingFocus(session: FocusSession, now: number): number {
  return Math.min(session.duration, Math.max(0, session.deadline === null ? session.remaining : Math.ceil((session.deadline - now) / 1000)));
}
export function reconcileFocus(session: FocusSession, now: number): FocusSession {
  if (session.deadline === null) return session;
  // A backward wall-clock jump pauses instead of extending a session silently.
  if (now < session.observedAt - 2000) return {...session,deadline:null,remaining:remainingFocus(session,session.observedAt),observedAt:now};
  const remaining = remainingFocus(session,now);
  return remaining > 0 ? {...session,remaining,observedAt:now} : {...session,remaining:0,deadline:null,observedAt:now,completedAt:session.deadline,completedFocus:session.completedFocus + (session.phase === 'focus' ? 1 : 0)};
}
export function startFocus(session: FocusSession, now: number): FocusSession {
  if (session.completedAt !== null || session.deadline !== null) return session;
  return {...session,observedAt:now,deadline:now + session.remaining * 1000};
}
export function pauseFocus(session: FocusSession, now: number): FocusSession {
  const current = reconcileFocus(session,now);
  return {...current,deadline:null,observedAt:now};
}
export function nextFocusPhase(session: FocusSession): FocusPhase {
  return session.phase !== 'focus' ? 'focus' : session.completedFocus % 4 === 0 ? 'longBreak' : 'shortBreak';
}
export function restoreFocusSession(raw: unknown, now: number): FocusSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string,unknown>;
  if (typeof r.id !== 'string' || !r.id || typeof r.duration !== 'number' || !validFocusDuration(r.duration) || typeof r.remaining !== 'number' || !Number.isFinite(r.remaining) || r.remaining < 0 || typeof r.task !== 'string') return null;
  const phase = r.version === 2 ? r.phase : r.kind === 'break' ? (r.duration >= 900 ? 'longBreak' : 'shortBreak') : 'focus';
  if (!['focus','shortBreak','longBreak'].includes(phase as string)) return null;
  const deadline = r.version === 2 ? r.deadline : r.end;
  if (deadline !== null && (typeof deadline !== 'number' || !Number.isFinite(deadline))) return null;
  const completedAt = r.version === 2 ? r.completedAt : r.remaining === 0 ? now : null;
  if (completedAt !== null && (typeof completedAt !== 'number' || !Number.isFinite(completedAt))) return null;
  const count = r.version === 2 ? r.completedFocus : 0;
  if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) return null;
  const observedAt = r.version === 2 ? r.observedAt : now;
  if (typeof observedAt !== 'number' || !Number.isFinite(observedAt)) return null;
  const candidate=r.target as Partial<FocusTarget>|undefined;
  const target=candidate&&['project','task'].includes(candidate.kind||'')&&typeof candidate.id==='string'&&typeof candidate.title==='string'?{kind:candidate.kind!,id:candidate.id.slice(0,100),title:candidate.title.slice(0,200)}:undefined;
  return reconcileFocus({version:2,id:r.id,phase:phase as FocusPhase,duration:r.duration,remaining:Math.min(r.duration,Math.ceil(r.remaining)),deadline:deadline as number|null,task:r.task.slice(0,500),completedFocus:count,observedAt,completedAt:completedAt as number|null,...(target?{target}:{})},now);
}
export function focusHistoryEntry(session: FocusSession) {
  if (session.completedAt === null) return null;
  return {date:new Date(session.completedAt).toISOString(),minutes:session.duration / 60,task:session.task,kind:session.phase === 'focus' ? 'focus' : 'break',...(session.target?{target:session.target}:{})};
}
export function recordFocusCompletion(session:FocusSession,storage:{getItem:(key:string)=>string|null;setItem:(key:string,value:string)=>void}) {
  const entry=focusHistoryEntry(session);
  if(!entry)return false;
  const history=JSON.parse(storage.getItem('daymark:focus-history')||'{}');
  if(!history || typeof history!=='object' || Array.isArray(history))throw Error('Invalid focus history');
  if(history[session.id])return false;
  storage.setItem('daymark:focus-history',JSON.stringify({...history,[session.id]:entry}));
  return true;
}
