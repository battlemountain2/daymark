import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lastFmAlbumArtwork} from '../src/lib/album-art';
import {filmPreview} from '../src/lib/media-preview';
import {cohesiveLayout,panelPreference,spacePreference,PANELS} from '../src/lib/dashboard-layout';
import {termWeek,readingsForWeek,readingsForAssignment,type ReadingLink} from '../src/lib/reading-links';
test('shared colors ignore obsolete per-space overrides but retain density and panel preferences',()=>{
 const layout={palette:'yharnam',accent:'terracotta','space:media':{palette:'forest',accent:'sage',density:'compact'},'panel:school:readings':{collapsed:false,pinned:true,order:0}};
 assert.equal(spacePreference(layout,'media').palette,'shared');assert.equal(spacePreference(layout,'media').accent,'terracotta');assert.equal(spacePreference(layout,'media').density,'compact');
 const migrated=cohesiveLayout(layout);assert.equal(panelPreference(migrated,'school','readings').collapsed,true);assert.equal(panelPreference(migrated,'school','readings').pinned,true);
 assert.equal(panelPreference({...migrated,'panel:school:readings':{collapsed:false}},'school','readings').collapsed,false);
 assert.ok(PANELS.find(p=>p.id==='fitness')?.tabs.includes('main'));assert.ok(!PANELS.find(p=>p.id==='fitness')?.tabs.includes('school'));
});
test('Last.fm fallback accepts only the exact album and HTTPS provider image',()=>{
 const art='https://lastfm-img.freetls.fastly.net/i/u/600x600/cover.jpg';
 const data={album:{artist:'FKA twigs',name:'EUSEXUA Afterglow',image:[{'#text':''},{'#text':art}]}};
 assert.equal(lastFmAlbumArtwork(data,'FKA twigs','EUSEXUA Afterglow'),art);
 assert.equal(lastFmAlbumArtwork(data,'FKA twigs','EUSEXUA'),null);
 assert.equal(lastFmAlbumArtwork({...data,album:{...data.album,image:[{'#text':'https://evil.example/a.jpg'}]}},'FKA twigs','EUSEXUA Afterglow'),null);
});
test('canonical Trakt identity bypasses ambiguous title search for shows',async()=>{
 const original=globalThis.fetch,calls:string[]=[];
 globalThis.fetch=async(input)=>{calls.push(String(input));return Response.json({meta:{id:'tt8772296',name:'Euphoria',poster:'https://images.metahub.space/poster/medium/tt8772296/img',description:'A show'}});};
 try{const p=await filmPreview('Euphoria','2019','show','tt8772296');assert.ok(p.artwork);assert.equal(calls.length,1);assert.ok(calls[0].includes('/meta/series/tt8772296.json'));assert.equal((await filmPreview('Euphoria',undefined,'show','../../bad')).artwork,null);assert.equal(calls.length,1);}finally{globalThis.fetch=original;}
});
test('reading week arithmetic survives DST and links preserve exact assignment IDs and term scope',()=>{
 assert.equal(termWeek('2026-08-17','2026-10-07'),8);assert.equal(termWeek('2026-08-17','2026-11-02'),12);
 const records:Record<string,ReadingLink>={a:{file:'pdf',title:'Reading',course:'HIST 300',termStart:'2026-08-17',week:8,assignment:'HIST 300:2026-10-08:Exact title'},b:{file:'old',title:'Old',course:'HIST 300',termStart:'2025-08-17',week:8}};
 assert.equal(readingsForWeek(records,'2026-08-17',8).length,1);assert.equal(readingsForAssignment(records,'HIST 300:2026-10-08:Exact title')[0].file,'pdf');assert.equal(readingsForAssignment(records,'Exact title').length,0);
});
