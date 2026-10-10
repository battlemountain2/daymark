import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newFocusSession,startFocus,pauseFocus,reconcileFocus,restoreFocusSession,remainingFocus,nextFocusPhase,focusHistoryEntry,recordFocusCompletion,formatFocusTime,validFocusDuration} from '../src/lib/focus-session';
test('fresh start cannot display the stale clock extra second; remaining is bounded',()=>{
 const s=startFocus(newFocusSession('one',10000),10900);
 assert.equal(remainingFocus(s,10000),1500);
 assert.equal(remainingFocus(s,10900),1500);
 assert.equal(remainingFocus(s,11900),1499);
 const paused=pauseFocus(s,14000);
 assert.equal(paused.remaining,1497);
 assert.equal(startFocus(paused,20000).deadline,1517000);
});
test('reload and background completion retain the deadline and count completion once',()=>{
 const s=startFocus(newFocusSession('one',1000),1000);
 const reloaded=restoreFocusSession(JSON.parse(JSON.stringify(s)),31000)!;
 assert.equal(reloaded.remaining,1470);
 assert.equal(reloaded.deadline,s.deadline);
 const completed=reconcileFocus(reloaded,2000000);
 assert.equal(completed.completedAt,s.deadline);
 assert.equal(completed.remaining,0);
 assert.equal(completed.completedFocus,1);
 assert.deepEqual(reconcileFocus(completed,3000000),completed);
 assert.equal(startFocus(completed,3000000),completed);
 assert.equal(focusHistoryEntry(completed)?.kind,'focus');
 assert.equal(nextFocusPhase(completed),'shortBreak');
});
test('every fourth focus offers a long break, with breaks excluded from focus count',()=>{
 const s=startFocus(newFocusSession('four',0,'focus',1500,'Reading',3),0);
 const completed=reconcileFocus(s,1500000);
 assert.equal(nextFocusPhase(completed),'longBreak');
 const breakDone=reconcileFocus(startFocus(newFocusSession('break',1500000,'longBreak',900,'Reading',4),1500000),2400000);
 assert.equal(breakDone.completedFocus,4);
 assert.equal(breakDone.deadline,null);
 assert.equal(focusHistoryEntry(breakDone)?.kind,'break');
 assert.equal(nextFocusPhase(breakDone),'focus');
});
test('backward clock changes pause safely rather than adding time',()=>{
 const s=reconcileFocus(startFocus(newFocusSession('one',10000),10000),30000);
 const corrected=reconcileFocus(s,1000);
 assert.equal(corrected.deadline,null);
 assert.equal(corrected.remaining,1480);
});
test('saved timers are validated and legacy Desk state migrates without restarting',()=>{
 const old={id:'legacy',duration:300,remaining:250,end:400000,task:'Break',kind:'break'};
 assert.equal(restoreFocusSession(old,200000)?.remaining,200);
 assert.equal(restoreFocusSession(old,200000)?.phase,'shortBreak');
 const valid=newFocusSession('one',1000);
 for(const invalid of [null,{}, {...valid,duration:NaN},{...valid,deadline:'oops'},{...valid,remaining:-1},{...valid,phase:'bogus'},{...valid,completedFocus:-1},{...valid,observedAt:Infinity}]) assert.equal(restoreFocusSession(invalid,1000),null);
});

test('history survives reload/retry without duplicate completion; failed writes can retry',()=>{
 let raw:string|null=null,writes=0,blocked=true;
 const store={getItem:()=>raw,setItem:(_key:string,value:string)=>{if(blocked)throw Error('Storage blocked');raw=value;writes++;}};
 const running=startFocus(newFocusSession('stable-id',0),0);
 assert.equal(recordFocusCompletion(running,store),false);
 const done=reconcileFocus(running,1500000);
 assert.throws(()=>recordFocusCompletion(done,store));
 blocked=false;
 assert.equal(recordFocusCompletion(done,store),true);
 assert.equal(recordFocusCompletion(restoreFocusSession(done,2000000)!,store),false);
 assert.equal(writes,1);
 assert.equal(Object.keys(JSON.parse(raw!)).length,1);
});

test('custom durations survive reload, finish once, and wait for the next phase',()=>{
 for (const seconds of [1,37,2700,7215,86400]) {
  assert.equal(validFocusDuration(seconds),true);
  const active=startFocus(newFocusSession(`custom-${seconds}`,1000,'focus',seconds),1000);
  const restored=restoreFocusSession(JSON.parse(JSON.stringify(active)),1500)!;
  assert.equal(restored.duration,seconds);
  assert.equal(restored.deadline,1000+seconds*1000);
  const done=reconcileFocus(restored,1000+seconds*1000);
  assert.equal(done.remaining,0);
  assert.equal(done.deadline,null);
  assert.equal(done.completedFocus,1);
  assert.equal(reconcileFocus(done,999999999).completedFocus,1);
 }
 for(const invalid of [0,-1,1.5,86401,NaN,Infinity])assert.equal(validFocusDuration(invalid),false);
 assert.equal(formatFocusTime(37),'00:37');
 assert.equal(formatFocusTime(2700),'45:00');
 assert.equal(formatFocusTime(7215),'2:00:15');
 assert.equal(formatFocusTime(86400),'24:00:00');
});
