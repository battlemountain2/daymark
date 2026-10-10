"use client";
import {useState} from "react";
import type {Term} from "@/lib/term";
import type {Item} from "./TodoPanel";
import {usePersonalRecords} from "@/lib/use-personal-records";
import {READING_LINKS_KEY,termWeek,readingsForWeek,readingUrl,type ReadingLink} from "@/lib/reading-links";
const courseKey=(s:string)=>s.replace(/\s/g,"").toUpperCase();
export function ReadingLinkEditor({file,title,course,term,assignments}:{file:string;title:string;course:string;term:Term;assignments:Item[]}) {
 const links=usePersonalRecords<ReadingLink>(READING_LINKS_KEY);
 const [message,setMessage]=useState("");
 const weeks=Math.max(1,termWeek(term.start,term.end));
 const existing=Object.entries(links.records).filter(([,r])=>r.file===file&&r.termStart===term.start);
 return <details className="reading-link-editor"><summary>Link to week or assignment{existing.length?` (${existing.length})`:""}</summary>
  {existing.map(([id,r])=><p key={id}>{r.week?`Week ${r.week}`:""}{r.week&&r.assignment?" · ":""}{r.assignment?assignments.find(a=>a.id===r.assignment)?.title||"Linked assignment":""} <button type="button" aria-label={`Remove reading link for ${title}`} onClick={()=>links.write(id,null)}>Remove</button></p>)}
  <form onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget),week=Number(data.get("week"))||undefined,assignment=String(data.get("assignment")||"")||undefined;if(!week&&!assignment){setMessage("Choose a week or an assignment.");return;}const id=JSON.stringify([file,term.start,week||null,assignment||null]);if(links.write(id,{file,title,course,termStart:term.start,week,assignment})){setMessage("Reading linked.");e.currentTarget.reset();}}}>
   <label>Week<select name="week"><option value="">No week</option>{Array.from({length:weeks},(_,i)=><option key={i+1} value={i+1}>Week {i+1}</option>)}</select></label>
   <label>Assignment<select name="assignment"><option value="">No assignment</option>{assignments.filter(a=>a.mine||courseKey(a.code)===courseKey(course)).map(a=><option key={a.id} value={a.id}>{a.title} · {a.due}</option>)}</select></label>
   <button type="submit">Save link</button>
  </form>{(message||links.error)&&<p role="status">{links.error||message}</p>}
 </details>;
}
export function WeekReadings({term,date,onRead}:{term:Term;date:string;onRead:(file:string)=>void}) {
 const links=usePersonalRecords<ReadingLink>(READING_LINKS_KEY),current=termWeek(term.start,date),weeks=Math.max(1,termWeek(term.start,term.end));
 const [chosen,setChosen]=useState<number|null>(null),week=chosen??Math.max(1,Math.min(weeks,current));
 if(!Object.values(links.records).some(r=>r.termStart===term.start&&r.week))return null;
 const readings=readingsForWeek(links.records,term.start,week);
 return <section className="week-reading-links"><label className="reading-course-filter">Linked readings <select value={week} onChange={e=>setChosen(Number(e.target.value))}>{Array.from({length:weeks},(_,i)=><option key={i+1} value={i+1}>Week {i+1}{i+1===current?" · this week":""}</option>)}</select></label>
  {readings.length?readings.map((r,i)=><a key={`${r.file}:${i}`} href={readingUrl(r.file)} onClick={e=>{e.preventDefault();onRead(r.file);}}><span className="mono sub">{r.course}</span> · {r.title}</a>):<p className="sub">No readings linked to this week.</p>}
 </section>;
}
