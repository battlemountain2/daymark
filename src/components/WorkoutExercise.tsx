"use client";
import {exerciseResult,type LoggedExercise,type LoadKind,type WorkoutSession} from "@/lib/workout-sessions";
import type {PendingWorkoutInput} from "./FitnessView";
type Props={exercise:LoggedExercise;number:number;session:WorkoutSession;previous:{session:WorkoutSession;ex:LoggedExercise}|null;pending:boolean;inputs:Record<string,PendingWorkoutInput>;onEnter:(id:string,index:number,field:"weight"|"reps",value:string)=>void;onChange:(change:(session:WorkoutSession)=>WorkoutSession)=>boolean;onComplete:(index:number)=>void};
export default function WorkoutExercise({exercise:ex,number,session,previous,inputs,onEnter,onChange,onComplete}:Props){
  function options(change:Partial<LoggedExercise>){onChange(s=>({...s,updatedAt:new Date().toISOString(),exercises:s.exercises.map(item=>item.id===ex.id?{...item,...change}:item)}));}
  return <article className="training-log-exercise">
    <div className="training-exercise-heading"><span className="training-index mono">{String(number).padStart(2,"0")}</span><div><h3>{ex.name}</h3><span className="sub">Plan: {ex.target}</span></div></div>
    {previous&&<p className="training-last">Last session · {exerciseResult(previous.ex,previous.session.unit)}</p>}
    <div className="training-exercise-options"><label>Load<select value={ex.kind} onChange={e=>options({kind:e.target.value as LoadKind})}><option value="weight">Weight</option><option value="bodyweight">Bodyweight</option><option value="assisted">Assistance</option><option value="band">Band</option></select></label><label>Rest<select value={ex.restSeconds} onChange={e=>options({restSeconds:Number(e.target.value)})}>{[30,60,90,120,180].map(seconds=><option key={seconds} value={seconds}>{seconds}s</option>)}</select></label></div>
    <div className="training-set-head"><span>Set</span><span>{ex.kind==="assisted"?`Assist · ${session.unit}`:ex.kind==="weight"?`Weight · ${session.unit}`:"Load"}</span><span>{ex.metric==="minutes"?"Minutes":"Reps"}</span><span>Done</span></div>
    {ex.sets.map((set,index)=><div key={index} className={`training-set-row${set.done?" is-done":""}`}><span className="mono">{index+1}</span>
      {["weight","assisted"].includes(ex.kind)?<input aria-label={`${ex.name} set ${index+1} ${ex.kind==="assisted"?"assistance":"weight"} in ${session.unit}`} inputMode="decimal" value={inputs[`${ex.id}:${index}:weight`]?.value??set.weight} placeholder="—" onChange={e=>onEnter(ex.id,index,"weight",e.target.value)}/>:<span className="training-load-label">{ex.kind==="bodyweight"?"Body":"Band"}</span>}
      <input aria-label={`${ex.name} set ${index+1} ${ex.metric}`} inputMode="numeric" value={inputs[`${ex.id}:${index}:reps`]?.value??set.reps} placeholder="—" onChange={e=>onEnter(ex.id,index,"reps",e.target.value)}/>
      <button type="button" aria-label={`${set.done?"Unmark":"Complete"} ${ex.name} set ${index+1}`} aria-pressed={set.done} onClick={()=>onComplete(index)}>{set.done?"✓":"○"}</button>
    </div>)}
    <details className="training-cue"><summary>Form cue</summary><p>{ex.cue}</p></details>
  </article>;
}
