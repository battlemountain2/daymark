import {test} from "node:test";
import assert from "node:assert/strict";
import {WORKOUT_DAYS} from "../src/lib/fitness-data";
import {newWorkoutSession,changeLoggedSet,finishWorkout,workoutProgress,previousExercise,WORKOUT_SESSIONS_KEY} from "../src/lib/workout-sessions";
import {SYNC_KEYS,splitRecords,joinRecords} from "../src/lib/sync-contract";
const monday=WORKOUT_DAYS[1];
const session=()=>newWorkoutSession(monday,"gym","lb",[],"first",new Date("2026-10-11T01:30:00Z"));
test("sessions retain performed date independently of routine day and snapshot the plan",()=>{
  const a=session(),b=newWorkoutSession({...monday,label:"Changed plan",gym:monday.gym.map(ex=>({...ex,name:"Renamed"}))},"gym","lb",[],"second",new Date("2026-10-11T02:30:00Z"));
  assert.equal(a.performedOn,"2026-10-10");assert.equal(a.plannedDay,"Monday");
  assert.equal(a.exercises[0].name,monday.gym[0].name);assert.equal(b.exercises[0].name,"Renamed");
  assert.equal(a.exercises[0].id,b.exercises[0].id);assert.notEqual(a.id,b.id);
});
test("completing requires actual reps, retains load, and sets one wall-clock rest deadline",()=>{
  let s=session();const id=s.exercises[0].id;
  assert.throws(()=>changeLoggedSet(s,id,0,{done:true}),/Enter the reps/);
  s=changeLoggedSet(s,id,0,{weight:"95",reps:"10"});s={...s,autoRest:true};
  s=changeLoggedSet(s,id,0,{done:true},new Date("2026-10-11T01:35:00Z"));
  assert.deepEqual(workoutProgress(s),{done:1,total:15});
  assert.equal(s.rest?.deadline,Date.parse("2026-10-11T01:36:30Z"));
  assert.equal(JSON.parse(JSON.stringify(s)).rest.deadline,s.rest.deadline);
  const cleared=changeLoggedSet(s,id,0,{reps:""});assert.equal(cleared.exercises[0].sets[0].done,false);
  assert.equal(s.exercises[0].sets[0].reps,"10");
  assert.throws(()=>changeLoggedSet(s,id,0,{weight:"-5"}));
  assert.throws(()=>changeLoggedSet(s,id,0,{reps:"1.5"}));
});
test("history prefills completed results with explicit unit conversion but leaves new sets incomplete",()=>{
  const first=session();const entered=changeLoggedSet(first,first.exercises[0].id,0,{weight:"100",reps:"8",done:true});
  const done=finishWorkout(entered,new Date("2026-10-11T02:00:00Z"));
  const next=newWorkoutSession(monday,"gym","kg",[done],"next",new Date("2026-10-12T14:00:00Z"));
  assert.equal(next.exercises[0].sets[0].weight,"45.4");assert.equal(next.exercises[0].sets[0].reps,"8");
  assert.equal(next.exercises[0].sets[0].done,false);assert.equal(workoutProgress(next).done,0);
  assert.equal(previousExercise([done,next],first.exercises[0].id,next.startedAt)?.session.id,"first");
  assert.throws(()=>finishWorkout(next));
  assert.equal(finishWorkout(done,new Date("2026-10-13T02:00:00Z")).finishedAt,done.finishedAt);
});
test("workout sync splits sessions independently without overwriting legacy namespaces",()=>{
  assert.ok((SYNC_KEYS as readonly string[]).includes(WORKOUT_SESSIONS_KEY));
  const a=session(),b={...a,id:"other"};
  const split=splitRecords(WORKOUT_SESSIONS_KEY,JSON.stringify({first:a,other:b}));
  assert.deepEqual(Object.keys(split),["first","other"]);
  delete split.first;
  assert.deepEqual(JSON.parse(joinRecords(WORKOUT_SESSIONS_KEY,split)),{other:b});
  assert.ok((SYNC_KEYS as readonly string[]).includes("daymark:workout:sets"));
});
test("recovery logs use minutes and do not label a walking session as gym lifting",()=>{
  const recovery=newWorkoutSession(WORKOUT_DAYS[0],"gym","lb",[],"rest");
  assert.equal(recovery.mode,"home");
  assert.equal(recovery.exercises[0].metric,"minutes");
});
