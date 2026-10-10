import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inlineNoteParts,safeNoteUrl,capturedTaskSource} from '../src/lib/note-links';
test('notebook preview supports reading citations, plain source URLs, and existing wiki text', () => {
  const parts = inlineNoteParts('See [Sutter p. 94](/?space=school&reading=abc&page=1), [[environmental history]], or https://example.com/source.');
  assert.deepEqual(parts.filter(p=>p.kind==='link'),[{kind:'link',text:'Sutter p. 94',url:'/?space=school&reading=abc&page=1'},{kind:'link',text:'https://example.com/source',url:'https://example.com/source'}]);
  assert.ok(parts.some(p=>p.kind==='wiki' && p.text==='[[environmental history]]'));
  assert.equal(parts.map(p=>p.text).join(''),'See Sutter p. 94, [[environmental history]], or https://example.com/source.');
});
test('note links reject script protocols, protocol-relative hosts, and credentials', () => {
  for(const url of ['javascript:alert(1)','data:text/html,test','//other.example','/\\other.example','https://user:password@example.com']) assert.equal(safeNoteUrl(url),false);
  assert.ok(inlineNoteParts('[unsafe](javascript:alert)').every(p=>p.kind!=='link'));
  const title='Review this message · https://mail.google.com/mail/u/?authuser=test%40example.com#all/123';
  assert.deepEqual(capturedTaskSource(title),{title:'Review this message',url:title.split(' · ')[1]});
  assert.deepEqual(capturedTaskSource('Ordinary task'),{title:'Ordinary task',url:null});
});
test('reader source lines link directly to the saved page and highlight', () => {
  const url='/?space=school&reading=abc&page=1&highlight=saved-highlight';
  assert.deepEqual(inlineNoteParts(`Source: ${url}`), [{kind:'text',text:'Source: '},{kind:'link',text:'Open source passage ↗',url}]);
  for(const url of ['//other.example','/\\other.example']) assert.ok(inlineNoteParts(`Source: ${url}`).every(p=>p.kind!=='link'));
  assert.ok(inlineNoteParts('Compare nature/culture in this passage.').every(p=>p.kind!=='link'));
});
