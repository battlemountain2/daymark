import {test} from 'node:test';
import assert from 'node:assert/strict';
import {appendCapture,captureTaskTitle} from '../src/lib/quick-capture';
import {dashboardSpaceUrl} from '../src/lib/dashboard-layout';

test('long email captures preserve a complete source link within the task limit', () => {
  const source = 'https://mail.google.com/mail/u/?authuser=test%40example.com#all/message123';
  const task = captureTaskTitle('A long email subject and snippet '.repeat(40),source);
  assert.ok(task.length <= 200);
  assert.ok(task.endsWith(source));
  assert.ok(task.includes('…'));
  assert.equal(captureTaskTitle('  Read\n\nthe syllabus  '),'Read the syllabus');
  assert.throws(() => captureTaskTitle('Reminder','https://example.com/' + 'x'.repeat(200)),/note or project/);
});
test('note capture appends to existing content and retains the source exactly', () => {
  assert.equal(appendCapture('Existing note','  New thought  ','https://example.com/message'), 'Existing note\n\nNew thought\nSource: https://example.com/message');
  assert.equal(appendCapture(undefined,'First thought'),'First thought');
});
test('space navigation replaces stale space without losing a reader deep link', () => {
  const url = new URL(dashboardSpaceUrl('https://daymark.example/?space=school&reading=abc&page=7#notes','media'),'https://daymark.example');
  assert.equal(url.searchParams.get('space'),'media');
  assert.equal(url.searchParams.get('reading'),'abc');
  assert.equal(url.searchParams.get('page'),'7');
  assert.equal(url.hash,'#notes');
  assert.equal(dashboardSpaceUrl('https://daymark.example/','school'),'/?space=school');
});
