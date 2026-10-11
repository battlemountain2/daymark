import {test} from 'node:test';
import assert from 'node:assert/strict';
import {githubRepository,repositoryDetails,projectTaskId} from '../src/lib/github-projects';
import {rediscoverPool} from '../src/lib/rediscover';
import {recentReviewTopics} from '../src/lib/review-insights';
import {newFocusSession,startFocus,restoreFocusSession,reconcileFocus,focusHistoryEntry} from '../src/lib/focus-session';
import {INITIAL_SRS_STATE,type SRSStore} from '../src/lib/spaced-repetition';
import type {Music} from '../src/lib/music';
import type {Pick} from '../src/lib/entertainment';
import type {Flashcard} from '../src/lib/study-hub-types';
test('repository links accept only canonical GitHub repo paths and public metadata',()=>{
  assert.equal(githubRepository('https://github.com/battlemountain2/hermes.git/')?.fullName,'battlemountain2/hermes');
  for(const url of ['http://github.com/me/repo','https://github.com.evil.com/me/repo','https://me@github.com/me/repo','https://github.com/me/repo/issues','https://github.com/me/repo?token=abc'])assert.equal(githubRepository(url),null);
  assert.equal(repositoryDetails({html_url:'https://github.com/me/repo',private:true}),null);
  assert.equal(repositoryDetails({html_url:'https://github.com/me/repo',description:null,open_issues_count:3})?.openItems,3);
  assert.equal(projectTaskId('project-one','Read documentation'),projectTaskId('project-one','Read documentation'));
  assert.notEqual(projectTaskId('project-one','Read documentation'),projectTaskId('project-one','Write documentation'));
});
test('project attribution survives timer reload and reaches completed history',()=>{
  const target={kind:'project' as const,id:'hermes',title:'Hermes'};
  const running=startFocus({...newFocusSession('focus',1000,'focus',60),target},1000);
  const reloaded=restoreFocusSession(JSON.parse(JSON.stringify(running)),2000)!;
  assert.deepEqual(reloaded.target,target);
  assert.deepEqual(focusHistoryEntry(reconcileFocus(reloaded,61000))?.target,target);
  assert.equal(restoreFocusSession({...running,target:{kind:'wrong',id:'a',title:'a'}},2000)?.target,undefined);
});
test('review hints use the latest actual grade within seven local days',()=>{
  const cards=[{id:'hard',courseCode:'MATH'},{id:'recovered',courseCode:'MATH'},{id:'old',courseCode:'ENGL'},{id:'future',courseCode:'BIOL'}] as Flashcard[];
  const make=(history:Array<{date:string;grade:number}>)=>({...INITIAL_SRS_STATE('test'),history}) as SRSStore[string];
  const store={hard:make([{date:'2026-10-09',grade:2}]),recovered:make([{date:'2026-10-09',grade:1},{date:'2026-10-10',grade:4}]),old:make([{date:'2026-09-30',grade:1}]),future:make([{date:'2026-10-11',grade:1}])};
  assert.deepEqual(recentReviewTopics(cards,store,'2026-10-10'),[{course:'MATH',count:1}]);
});
test('rediscover uses known albums, deduplicates them, and excludes recent listening',()=>{
  const music={recent:[{artist:'Artist',album:'Recent'}]} as Music;
  const saved=[{kind:'album',artist:'Artist',title:'Earlier'},{kind:'album',artist:'Artist',title:'Recent'},{kind:'album',title:'Unknown artist'}] as Pick[];
  const history=[{kind:'Listening',artist:'artist',album:'earlier'},{kind:'Listening',detail:'Do not guess',title:'Track'}] as Pick[];
  const pool=rediscoverPool(music,saved,history,[{artist:'Seed',album:'Album'}]);
  assert.equal(pool.length,1);assert.equal(pool[0].album.toLowerCase(),'earlier');
  assert.deepEqual(rediscoverPool(music,[],[],[{artist:'Seed',album:'Album'}]),[{artist:'Seed',album:'Album',source:'Daymark picks'}]);
});
