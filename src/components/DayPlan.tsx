"use client";
import Link from 'next/link';
import {WORKOUT_DAYS} from '@/lib/fitness-data';
import {workoutWindows} from '@/lib/workout-windows';
import type {ClassBlock} from '@/lib/schedule';
import {usePersonalRecords} from '@/lib/use-personal-records';
export default function DayPlan({classes,now}:{classes:ClassBlock[];now:{dow:number;minutes:number}}) {
 const settings=usePersonalRecords<{duration:number;buffer:number}>('daymark:layout');
 const saved=settings.records['workout-window'];
 const duration=[30,45,60,75,90].includes(saved?.duration)?saved.duration:60,buffer=[10,15,20,30].includes(saved?.buffer)?saved.buffer:20;
 const workout=WORKOUT_DAYS.find(w=>w.dow===now.dow),windows=workoutWindows(classes,now.minutes,duration,buffer);
 if(!workout)return null;
 return <div className="day-flexible-plan"><div className="day-plan-heading"><span className="mono sub">FLEXIBLE PLAN</span><Link href="/fitness">{workout.isRest?'Rest day':`Gym · ${workout.label}`} ↗</Link></div>
  {!workout.isRest&&classes.length>0&&<><div className="gym-windows">{windows.map(w=><span key={w.start}>{time(w.start)}{w.lastStart>w.start?`–${time(w.lastStart)}`:''} start</span>)}</div>{!windows.length&&<p className="sub">No full window remains between classes and 9pm.</p>}<details className="gym-window-settings"><summary>Window settings</summary><p className="sub">Suggested start times for a {duration}-minute workout, allowing {buffer} minutes on each side for travel and changing. These are flexible suggestions.</p><label>Workout length<select value={duration} onChange={e=>settings.write('workout-window',{duration:Number(e.target.value),buffer})}>{[30,45,60,75,90].map(m=><option key={m} value={m}>{m} minutes</option>)}</select></label><label>Buffer on each side<select value={buffer} onChange={e=>settings.write('workout-window',{duration,buffer:Number(e.target.value)})}>{[10,15,20,30].map(m=><option key={m} value={m}>{m} minutes</option>)}</select></label></details></>}
 </div>;
}
function time(value:number){const h=Math.floor(value/60),m=value%60;return `${h%12||12}:${String(m).padStart(2,'0')}${h<12?'am':'pm'}`;}
