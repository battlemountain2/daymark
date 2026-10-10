import {test} from 'node:test';
import assert from 'node:assert/strict';
import {soundtracks,matchSoundtrack} from '../src/lib/soundtracks';
import {matchAlbum} from '../src/lib/album-art';
test('soundtrack matching requires the confirmed catalog identity, title, and credits',()=>{
 for(const s of soundtracks){
  const correct={collectionId:s.catalogId,collectionName:s.album,artistName:s.artist};
  const cover={...correct,collectionId:999,artistName:'Piano tribute'};
  assert.equal(matchSoundtrack([cover,correct],s),correct);
  assert.equal(matchSoundtrack([cover],s),null);
  assert.equal(matchSoundtrack([{...correct,collectionName:s.album+' Piano Collections'}],s),null);
  assert.equal(matchSoundtrack([{...correct,artistName:'Cover artist'}],s),null);
 }
 assert.equal(matchAlbum([{collectionName:'Record',artistName:'Other'}],'Artist','Record'),null);
});
