import test from 'node:test';
import assert from 'node:assert/strict';
import { matchMedia, safeArtwork } from '../src/lib/media-preview';
import { getMusic } from '../src/lib/music';
test('movie matching distinguishes same-title remakes by year',()=>{
 const movies=[{id:'tt1',name:'The Thing',releaseInfo:'1982'},{id:'tt2',name:'The Thing',releaseInfo:'2011'}];
 assert.equal(matchMedia(movies,'The Thing','1982')?.id,'tt1');
 assert.equal(matchMedia(movies,'The Thing'),null);
 assert.equal(matchMedia(movies,'The Thing','1999'),null);
 assert.equal(matchMedia([{id:'https://evil.example',name:'The Thing',releaseInfo:'1982'}],'The Thing','1982'),null);
});
test('artwork accepts HTTPS provider hosts and rejects arbitrary or lookalike hosts',()=>{
 assert.equal(safeArtwork('https://m.media-amazon.com/images/test.jpg'),'https://m.media-amazon.com/images/test.jpg');
 assert.equal(safeArtwork('https://ia800000.us.archive.org/cover.jpg'),'https://ia800000.us.archive.org/cover.jpg');
 for(const url of ['http://m.media-amazon.com/test.jpg','https://static.tvmaze.com.evil.example/test.jpg','javascript:alert(1)','https://evil.example/test.jpg']) assert.equal(safeArtwork(url),null);
});
test('Last.fm recent listening remains available if optional artist stats fail',async()=>{
 const originalFetch=globalThis.fetch, oldKey=process.env.LASTFM_API_KEY,oldUser=process.env.LASTFM_USER;
 process.env.LASTFM_API_KEY='test-key';process.env.LASTFM_USER='test-user';
 globalThis.fetch=async(input)=>{
  const url=new URL(String(input));
  if(url.searchParams.get('method')==='user.getrecenttracks') return Response.json({recenttracks:{track:[{name:'Song',artist:{'#text':'Artist'},album:{'#text':'Record'},image:[],date:{uts:'1700000000'}}],'@attr':{total:'42'}}});
  return Response.json({error:16,message:'Service temporarily unavailable'});
 };
 try{const music=await getMusic();assert.equal(music.source,'lastfm');assert.equal(music.error,null);assert.equal(music.recent[0].title,'Song');assert.deepEqual(music.top,[]);}finally{
  globalThis.fetch=originalFetch;
  if(oldKey===undefined)delete process.env.LASTFM_API_KEY;else process.env.LASTFM_API_KEY=oldKey;
  if(oldUser===undefined)delete process.env.LASTFM_USER;else process.env.LASTFM_USER=oldUser;
 }
});
