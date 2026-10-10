"use client";
import {useEffect,useState} from 'react';
export default function AlbumArtwork({artist,album,motif,design}:{artist:string;album:string;motif?:string;design?:string}) {
 const key=`${artist}:${album}`;
 const [result,setResult]=useState<{key:string;art:string|null;failed:boolean}|null>(null);
 useEffect(()=>{
  const controller=new AbortController();
  fetch(`/api/album-art?${new URLSearchParams({artist,album,v:"2"})}`,{signal:controller.signal})
   .then(r=>r.ok?r.json():null).then(data=>{if(!controller.signal.aborted)setResult({key,art:data?.art||null,failed:!data?.art});})
   .catch(()=>{if(!controller.signal.aborted)setResult({key,art:null,failed:true});});
  return()=>controller.abort();
 },[artist,album,key]);
 const current=result?.key===key?result:null;
 return current?.art?<img className="shuffle-art" src={current.art} alt={`${album} cover`} onError={()=>setResult({key,art:null,failed:true})}/>:<div className="shuffle-art soundtrack-art-fallback" data-design={design||'record'} role="img" aria-label={`${album} · ${current?.failed?'artwork unavailable':'loading artwork'}`}>
  <svg className="soundtrack-graphic" viewBox="0 0 300 300" aria-hidden="true"><circle cx="150" cy="150" r="126"/><circle cx="150" cy="150" r="94"/><circle cx="150" cy="150" r="62"/><circle cx="150" cy="150" r="24"/><path d="M0 220L300 80M0 260L300 120M0 180L300 40"/></svg>
  <span className="soundtrack-motif mono" aria-hidden="true">{motif||'SIDE A'}</span>
  <strong aria-hidden="true">{design?motif:album}</strong>
  <span className="soundtrack-fallback-label" aria-hidden="true">{current?.failed?'Artwork unavailable':'Loading artwork'}</span>
 </div>;
}
