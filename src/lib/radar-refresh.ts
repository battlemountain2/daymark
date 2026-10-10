import {randomUUID} from 'node:crypto';
import {db} from './db';
import {readRecords,applyRecords} from './sync-db';
import type {SyncRecord,SyncEdit} from './sync-contract';
import {validFollow,releaseSnapshotFor,type Follow,type Release} from './release-radar';
import {missingRadarReleases} from './radar-reconcile';
export type RadarState = {dismissed?:boolean;snooze?:string;missing?:boolean;checkedAt?:string;attemptedAt?:string;failed?:boolean;partial?:boolean;day?:string;remaining?:number};
const DAY=86400000;
function values<T>(records:SyncRecord[],namespace:string):Record<string,T> {
 return Object.fromEntries(records.filter(r=>r.namespace===namespace&&r.value!==null).flatMap(r=>{try{return [[r.key,JSON.parse(r.value!) as T]];}catch{return [];}}));
}
export function radarDue(state:RadarState|undefined,now:number,force=false) {
 if(force)return true;
 if(state?.failed)return now-Date.parse(state.attemptedAt||state.checkedAt||'')>=3600000||!state.attemptedAt;
 return !state?.checkedAt||now-Date.parse(state.checkedAt)>=DAY||!Number.isFinite(Date.parse(state.checkedAt));
}
/** A database lease prevents cron, duplicate invocations and panel refresh racing. */
export async function refreshStoredRadar({force=false,scheduled=false,now=new Date(),snapshot=releaseSnapshotFor}:{force?:boolean;scheduled?:boolean;now?:Date;snapshot?:typeof releaseSnapshotFor}={}) {
 const owner=randomUUID(),time=Date.now();
 await db().execute('CREATE TABLE IF NOT EXISTS radar_lease (id TEXT PRIMARY KEY, owner TEXT NOT NULL, expires INTEGER NOT NULL)');
 const lease=await db().execute({sql:'INSERT INTO radar_lease(id,owner,expires) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner,expires=excluded.expires WHERE radar_lease.expires<=?',args:['refresh',owner,time+260000,time]});
 if(!lease.rowsAffected)return {busy:true,checked:0,failed:0,remaining:0};
 try {
  const initial=await readRecords(),states=values<RadarState>(initial,'daymark:radar-state');
  const day=now.toISOString().slice(0,10);
  if(scheduled&&states.schedule?.day===day)return {busy:false,checked:0,failed:0,remaining:states.schedule.remaining||0};
  const follows=values<Follow>(initial,'daymark:radar-follows');
  const due=Object.keys(follows).filter(key=>{const [provider,id]=key.split(':');return validFollow(provider,id)&&follows[key].provider===provider&&follows[key].id===id&&radarDue(states[`check:${key}`],now.getTime(),force || scheduled && states[`check:${key}`]?.checkedAt?.slice(0,10)!==day);})
   .sort((a,b)=>(Date.parse(states[`check:${a}`]?.attemptedAt||states[`check:${a}`]?.checkedAt||'')||0)-(Date.parse(states[`check:${b}`]?.attemptedAt||states[`check:${b}`]?.checkedAt||'')||0));
  let checked=0,failed=0,processed=0;
  for(const key of due.slice(0,20)) {
   if(Date.now()-time>120000)break;
   processed++;
   const [provider,id]=key.split(':');
   let result:Awaited<ReturnType<typeof releaseSnapshotFor>>|null=null;
   try{result=await snapshot(provider,id,now);}catch{failed++;}
   // Read again after each provider call: do not overwrite a dismissal made meanwhile.
   const records=await readRecords(),latest=values<RadarState>(records,'daymark:radar-state');
   if(!values<Follow>(records,'daymark:radar-follows')[key])continue;
   const edits:SyncEdit[]=[];
   const set=(namespace:string,key:string,value:unknown)=>edits.push({namespace,key,value:JSON.stringify(value),version:records.find(r=>r.namespace===namespace&&r.key===key)?.version||0,operation:randomUUID()});
   if(result) {
    checked++;
    const saved=values<Release>(records,'daymark:releases');
    const since=new Date(now.getTime()-14*DAY).toISOString().slice(0,10),until=new Date(now.getTime()+180*DAY).toISOString().slice(0,10);
    if(result.complete)for(const missing of missingRadarReleases(Object.values(saved),result.releases,key,since,until))set('daymark:radar-state',missing,{...latest[missing],missing:true});
    for(const release of result.releases) {
     set('daymark:releases',release.id,release);
     if(latest[release.id]?.missing)set('daymark:radar-state',release.id,{...latest[release.id],missing:false});
    }
   }
   set('daymark:radar-state',`check:${key}`,{...latest[`check:${key}`],...(result?{checkedAt:now.toISOString(),partial:!result.complete}:{}),attemptedAt:now.toISOString(),failed:!result});
   const conflicts=await applyRecords(edits);
   if(conflicts.length)console.warn('Radar retained concurrent edits',conflicts.length);
  }
  const remaining=Math.max(0,due.length-processed);
  if(scheduled) {
   const records=await readRecords();
   await applyRecords([{namespace:'daymark:radar-state',key:'schedule',value:JSON.stringify({day,checkedAt:now.toISOString(),remaining,failed:failed>0}),version:records.find(r=>r.namespace==='daymark:radar-state'&&r.key==='schedule')?.version||0,operation:randomUUID()}]);
  }
  return {busy:false,checked,failed,remaining};
 } finally {await db().execute({sql:'DELETE FROM radar_lease WHERE id=? AND owner=?',args:['refresh',owner]});}
}
