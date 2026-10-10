import {test} from 'node:test';import assert from 'node:assert/strict';import {groupMusicEditions,missingRadarReleases} from '../src/lib/radar-reconcile';
import {releaseSnapshotFor} from '../src/lib/release-radar';
test('MusicBrainz editions deduplicate by release group, not title, and preserve a dated edition',()=>{
 const rows=[{id:'one',title:'Record',date:'2026-10-10','release-group':{id:'a'}},{id:'two',title:'Record Deluxe',date:'2026-10-09','release-group':{id:'a'}},{id:'three',title:'Record',date:'2026-10-10','release-group':{id:'b'}},{id:'partial',title:'Partial',date:'2026-10'}];
 assert.deepEqual(groupMusicEditions(rows,'2026-10-01','2027-01-01').map(r=>r.id),['two','three']);
});
test('reconciliation only marks missing dates from the refreshed follow and returned date window',()=>{
 const make=(id:string,follow?:string,date='2026-10-10')=>({id,follow,date,title:'Release',url:'https://example.com',kind:'Show'});
 const old=[make('gone','tvmaze:1'),make('same','tvmaze:1'),make('manual'),make('other','tvmaze:2'),make('old','tvmaze:1','2026-01-01')];
 assert.deepEqual(missingRadarReleases(old,[make('same','tvmaze:1')],'tvmaze:1','2026-10-01','2027-01-01'),['gone']);
});
test('a limited MusicBrainz response is explicitly partial, with canonical identities and edition artwork',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({count:80,releases:[{id:'edition',title:'Record',date:'2026-10-10','release-group':{id:'group'}}]});
 try{const result=await releaseSnapshotFor('musicbrainz','artist',new Date('2026-10-07'));assert.equal(result.complete,false);assert.equal(result.releases[0].id,'musicbrainz:group');assert.equal(result.releases[0].artworkId,'edition');assert.equal(result.releases[0].source,'MusicBrainz · edition date');}
 finally{globalThis.fetch=original;}
});
