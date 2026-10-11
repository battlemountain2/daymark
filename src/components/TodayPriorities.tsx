"use client";
import {use} from "react";
import type {CanvasResult} from "@/app/page";
import type {State} from "@/lib/db";
import {usePersonalRecords} from "@/lib/use-personal-records";
import {buildItems} from "./TodoPanel";
import type {FocusTarget} from "@/lib/focus-session";
export default function TodayPriorities({promise,state,date,busy,onChange,onFocus}:{promise:Promise<CanvasResult>;state:State;date:string;busy:boolean;onChange:(body:Record<string,unknown>)=>void;onFocus:(target:FocusTarget)=>void}){
  const canvas=use(promise), items=buildItems(canvas.assignments,state).filter(item=>!state.dismissed.includes(item.id));
  const prefs=usePersonalRecords<{date:string;ids:string[]}>("daymark:layout");
  const saved=prefs.records['today-priorities'];
  const ids=(saved?.date===date&&Array.isArray(saved.ids)?saved.ids:[]).filter(id=>items.some(item=>item.id===id));
  const chosen=items.filter(item=>ids.includes(item.id));
  const available=items.filter(item=>!item.done||ids.includes(item.id));
  return <div className="today-priorities">
    {chosen.length>0&&<><h3>Your priorities</h3><ul>{chosen.map(item=><li key={item.id}><label><input type="checkbox" checked={item.done} disabled={busy} onChange={e=>onChange(item.mine?{action:'todoDone',id:item.id,done:e.target.checked}:{action:'tick',key:item.id,done:e.target.checked})}/><span className={item.done?'is-done':''}>{item.title}</span></label>{!item.done&&<button type="button" onClick={()=>onFocus({kind:'task',id:item.id,title:item.title})}>Focus</button>}</li>)}</ul></>}
    <details><summary>{chosen.length?'Edit priorities':"Choose today’s priorities"}</summary><p className="sub">Choose up to three existing tasks for today.</p>{available.map(item=><label key={item.id}><input type="checkbox" checked={ids.includes(item.id)} disabled={ids.length>=3&&!ids.includes(item.id)} onChange={e=>prefs.write('today-priorities',{date,ids:e.target.checked?[...ids,item.id]:ids.filter(id=>id!==item.id)})}/>{item.title}</label>)}{!available.length&&<p className="sub">{items.length?'All your tasks are complete.':'Add a task in School to choose it here.'}</p>}</details>
    {prefs.error&&<p role="alert">{prefs.error}</p>}
  </div>;
}
