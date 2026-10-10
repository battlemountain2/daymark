import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyBrief } from '../src/lib/daily-brief';
import { DEFAULT_TERM } from '../src/lib/term';
import { mailPreview, mailSender } from '../src/lib/mail-display';
import { fetchAssignments } from '../src/lib/canvas';

const base = { now: { iso: '2026-10-09', dow: 5, minutes: 1395 }, term: DEFAULT_TERM, classes: [], weather: null };
test('break-day brief still surfaces a real deadline and completed work clears it', () => {
  const item = { title: 'Transfer application', due: '2026-10-09', done: false };
  assert.equal(dailyBrief({ ...base, items: [item] }, 'ready').tone, 'due');
  assert.match(dailyBrief({ ...base, items: [item] }, 'ready').lead, /Transfer application/);
  const complete = dailyBrief({ ...base, items: [{ ...item, done: true }] }, 'ready');
  assert.equal(complete.lead, 'Break day');
  assert.match(complete.sub || '', /Nothing due/);
});
test('an unavailable or loading assignment feed never claims there is no work', () => {
  for (const status of ['loading', 'unavailable'] as const) {
    const brief = dailyBrief({ ...base, items: [] }, status);
    assert.doesNotMatch(brief.sub || '', /Nothing due/);
    assert.ok(brief.availability);
  }
  const saved = dailyBrief({ ...base, items: [{ title: 'Saved task', due: '2026-10-09', done: false }] }, 'unavailable');
  assert.equal(saved.tone, 'due');
  assert.ok(saved.availability);
});
test('Gmail snippets decode entities as text, including Unicode, without parsing markup', () => {
  assert.equal(mailPreview('I&#39;m &amp; &#x1F305; &lt;script&gt;'), "I'm & 🌅 <script>");
  assert.equal(mailPreview('&#x110000; &#55296; &unknown;'), '&#x110000; &#55296; &unknown;');
  assert.equal(mailPreview('&amp;lt;'), '&lt;');
  assert.equal(mailSender('"Advisor" <advisor@example.com>'), 'Advisor');
  assert.equal(mailSender('<advisor@example.com>'), '<advisor@example.com>');
});
test('Canvas feed requests have a deadline so a dead source can release its panel', async () => {
  const original = globalThis.fetch;
  let signal: AbortSignal | null | undefined;
  globalThis.fetch = async (_input, init) => { signal = init?.signal; return new Response('BEGIN:VCALENDAR\nEND:VCALENDAR'); };
  try { assert.deepEqual(await fetchAssignments('https://example.com/calendar'), []); assert.ok(signal instanceof AbortSignal); }
  finally { globalThis.fetch = original; }
});
