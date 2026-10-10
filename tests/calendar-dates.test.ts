import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIcs, assignmentKey } from '../src/lib/canvas';

const event = (start: string) => `BEGIN:VEVENT\nSUMMARY:Lab report [GEOG-1160-001]\n${start}\nEND:VEVENT`;
test('late-night UTC deadlines display on the Denver day while preserving saved IDs', () => {
  const summer = parseIcs(event('DTSTART:20261010T055900Z'))[0];
  assert.equal(summer.due, '2026-10-09');
  assert.equal(summer.id, assignmentKey('2026-10-10', 'Lab report'));
  assert.equal(parseIcs(event('DTSTART:20261110T065900Z'))[0].due, '2026-11-09');
  assert.equal(parseIcs(event('DTSTART:20261010T060000Z'))[0].due, '2026-10-10');
});
test('all-day and floating dates stay literal, while named zones convert to Denver', () => {
  for (const start of ['DTSTART;VALUE=DATE:20261009', 'DTSTART:20261009T235900', 'DTSTART;TZID=America/Denver:20261009T235900']) {
    const assignment = parseIcs(event(start))[0];
    assert.equal(assignment.due, '2026-10-09');
    assert.equal(assignment.id, assignmentKey('2026-10-09', 'Lab report'));
  }
  assert.equal(parseIcs(event('DTSTART;TZID=America/New_York:20261010T010000'))[0].due, '2026-10-09');
});
test('invalid calendar dates are skipped instead of becoming phantom deadlines', () => {
  assert.deepEqual(parseIcs(event('DTSTART:20260230T235900Z')), []);
  assert.deepEqual(parseIcs(event('DTSTART:nonsense')), []);
});
