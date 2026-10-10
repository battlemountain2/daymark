import {test} from 'node:test';
import assert from 'node:assert/strict';
import {editNotebookNote,noteTitle,NOTEBOOK_KEY} from '../src/lib/notebook';
import {splitRecords,joinRecords,SYNC_KEYS} from '../src/lib/sync-contract';
import {temperatureRange} from '../src/lib/weather-display';
test('notes retain identity and original creation while content and title evolve',()=>{
 const first=editNotebookNote('note-a','HIST 300','Water',undefined,100);
 const edited=editNotebookNote(first.id,first.course,'# Water and religion\nA quoted passage.',first,200);
 assert.equal(edited.id,first.id);assert.equal(edited.createdAt,100);assert.equal(edited.updatedAt,200);assert.equal(edited.title,'Water and religion');assert.equal(edited.content,'# Water and religion\nA quoted passage.');
 assert.equal(noteTitle('\n\n'), 'Untitled note');
});
test('notebook entries sync independently and a new draft never replaces earlier notes',()=>{
 assert.ok((SYNC_KEYS as readonly string[]).includes(NOTEBOOK_KEY));
 const a=editNotebookNote('note-a','General','First thought',undefined,100),b=editNotebookNote('note-b','General','Second thought',undefined,200);
 const entries=splitRecords(NOTEBOOK_KEY,JSON.stringify({[a.id]:a,[b.id]:b}));
 assert.deepEqual(JSON.parse(joinRecords(NOTEBOOK_KEY,entries)),{'note-a':a,'note-b':b});
 delete entries['note-b'];assert.equal(JSON.parse(joinRecords(NOTEBOOK_KEY,entries))['note-a'].content,'First thought');
});
test('weather range treats missing temperatures as unknown and handles a flat weekly scale',()=>{
 assert.equal(temperatureRange(null,80,40,90),null);assert.equal(temperatureRange(50,80,Infinity,-Infinity),null);
 assert.deepEqual(temperatureRange(50,50,50,50),{left:0,width:3});assert.deepEqual(temperatureRange(40,80,40,90),{left:0,width:80});
});
