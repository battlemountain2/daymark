import {test,after,before} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {db} from '../src/lib/db';
import {applyRecords,readRecords} from '../src/lib/sync-db';
import {refreshStoredRadar,radarDue} from '../src/lib/radar-refresh';
before(async()=>{const folder=await mkdtemp(join(tmpdir(),'daymark-radar-test-'));process.env.TURSO_DATABASE_URL=`file:${folder}/radar.db`;delete process.env.TURSO_AUTH_TOKEN;});
after(()=>db().close());
const follow='tvmaze:123';
async function write(namespace:string,key:string,value:unknown) {const records=await readRecords();await applyRecords([{namespace,key,value:JSON.stringify(value),version:records.find(r=>r.namespace===namespace&&r.key===key)?.version||0,operation:randomUUID()}]);}
async function state(key:string){return JSON.parse((await readRecords()).find(r=>r.namespace==='daymark:radar-state'&&r.key===key)?.value||'{}');}
test('daily radar retains concurrent snooze, reconciles only complete snapshots, skips duplicate cron and preserves dates on failure',async()=>{
 await write('daymark:radar-follows',follow,{id:'123',provider:'tvmaze',name:'Show'});
 await write('daymark:releases','tvmaze:old',{id:'tvmaze:old',follow,title:'Old',date:'2026-10-10'});
 await write('daymark:radar-state','tvmaze:new',{dismissed:true,missing:true});
 let calls=0;
 const snapshot=async()=>{calls++;await write('daymark:radar-state','tvmaze:new',{dismissed:true,missing:true,snooze:'2026-10-20'});return {complete:true,releases:[{id:'tvmaze:new',title:'New',date:'2026-10-12',url:'https://tvmaze.com',kind:'Show',follow}]};};
 const now=new Date('2026-10-07T13:00:00Z');
 const result=await refreshStoredRadar({scheduled:true,now,snapshot});assert.equal(result.checked,1);assert.equal((await state('tvmaze:old')).missing,true);assert.deepEqual(await state('tvmaze:new'),{dismissed:true,missing:false,snooze:'2026-10-20'});
 await refreshStoredRadar({scheduled:true,now,snapshot});assert.equal(calls,1);
 await refreshStoredRadar({scheduled:true,now:new Date("2026-10-08T12:55:00Z"),snapshot});assert.equal(calls,2);
 await refreshStoredRadar({force:true,now:new Date('2026-10-08T13:00:00Z'),snapshot:async()=>{throw Error('offline');}});assert.equal((await state(`check:${follow}`)).failed,true);assert.equal((await state('tvmaze:new')).snooze,'2026-10-20');assert.ok((await readRecords()).some(r=>r.key==='tvmaze:new'&&r.namespace==='daymark:releases'));
 await refreshStoredRadar({force:true,now,snapshot:async()=>({complete:false,releases:[]})});assert.equal((await state('tvmaze:new')).missing,false);
});
test('lease prevents overlapping checks',async()=>{
 let finish!:()=>void,started!:()=>void;const began=new Promise<void>(r=>started=r),gate=new Promise<void>(r=>finish=r);
 const first=refreshStoredRadar({force:true,snapshot:async()=>{started();await gate;return {complete:false,releases:[]};}});await began;
 try{assert.equal((await refreshStoredRadar({force:true})).busy,true);}finally{finish();await first;}
});
test('recent successful checks are skipped and failed checks retry after an hour',()=>{
 const now=Date.parse('2026-10-07T13:00:00Z');assert.equal(radarDue({checkedAt:'2026-10-07T12:00:00Z'},now),false);assert.equal(radarDue({failed:true,attemptedAt:'2026-10-07T11:00:00Z'},now),true);assert.equal(radarDue({failed:true,attemptedAt:'2026-10-07T12:59:00Z'},now),false);
});
