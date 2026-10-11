"use client";
import Link from "next/link";
import {WORKOUT_DAYS} from "@/lib/fitness-data";
import {usePersonalRecords} from "@/lib/use-personal-records";
import {WORKOUT_SESSIONS_KEY,workoutProgress,type WorkoutSession} from "@/lib/workout-sessions";
export default function FitnessGlance({now}:{now:{iso:string;dow:number}}){
  const log=usePersonalRecords<WorkoutSession>(WORKOUT_SESSIONS_KEY);
  const sessions=Object.values(log.records).sort((a,b)=>b.startedAt.localeCompare(a.startedAt));
  const active=sessions.find(s=>!s.finishedAt), completed=sessions.find(s=>s.performedOn===now.iso&&s.finishedAt);
  const recorded=active||completed, plan=WORKOUT_DAYS.find(d=>d.dow===now.dow)!;
  const progress=recorded?workoutProgress(recorded):null;
  return <section className="card span5 fitness-glance-card"><div className="card-head"><h2>Today&apos;s Workout</h2><Link href="/fitness">Training log ↗</Link></div><div className="card-body">
    <h3 className="fg-title">{recorded?.title||plan.label}</h3>
    <p className="sub">{progress?`${progress.done}/${progress.total} sets · ${active?'In progress':'Session saved'}`:plan.isRest?'Recovery day':`${plan.gym.length} exercises in your plan`}</p>
    <Link href={recorded?`/fitness?session=${encodeURIComponent(recorded.id)}`:"/fitness"} className="glance-btn">{active?'Continue training →':completed?'View your session →':plan.isRest?'View recovery plan →':'Open training →'}</Link>
    {log.error&&<p role="status">{log.error}</p>}
  </div></section>;
}
export function FitnessGlanceSkeleton(){return <section className="card span5 fitness-glance-card"><div className="card-head"><h2>Today&apos;s Workout</h2></div><div className="card-body"><span className="bar" style={{width:"70%",height:28}}/></div></section>;}
