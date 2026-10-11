"use client";
import {useState} from "react";
import type {Pick} from "@/lib/entertainment";
function RecapCover({item}:{item:Pick}){
  const [failed,setFailed]=useState(false);
  return item.artwork&&!failed?<img src={item.artwork} alt="" loading="lazy" onError={()=>setFailed(true)}/>:<div className="recap-cover-fallback"><span>{item.kind==='Listening'?'Music':item.kind}</span><strong>{item.album||item.title}</strong></div>;
}
export default function MediaWeekRecap({events}:{events:Pick[]}){
  const groups=Array.from(new Map(events.map(item=>[`${item.kind}:${item.artist||item.detail}:${item.album||item.title}`,item])).values()).slice(0,12);
  const listens=events.filter(item=>item.kind==='Listening').length;
  return <details className="personal-setup media-week"><summary>Week in Media · {events.length} recorded</summary>
    {events.length?<><p className="media-recap-count"><strong>{listens}</strong> listens <span>·</span> <strong>{events.length-listens}</strong> other recorded items</p><div className="media-recap-grid">{groups.map(item=><a key={`${item.kind}:${item.id}`} href={item.url} target="_blank" rel="noreferrer"><RecapCover item={item}/><strong>{item.album||item.title}</strong><span className="sub">{item.artist||item.detail}</span></a>)}</div></>:<p className="sub">Nothing recorded this week yet.</p>}
    <p className="sub">Saved listening, reported viewing, and items marked finished. Repeated listens count separately; covers are grouped. Steam’s two-week playtime is excluded.</p>
  </details>;
}
