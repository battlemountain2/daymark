import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CommuteRadar from '../src/components/CommuteRadar';

const lecture = { code: 'GEOG 1150', title: 'Environmental Studies', where: 'Mitchell Hall 120', start: '14:00', end: '14:50', ck: 'geo' };

test('finished day shows no expired departure or lecture', () => {
  const html = renderToStaticMarkup(React.createElement(CommuteRadar, { nextClass: null, nowMinutes: 936, doneForToday: true }));
  assert.match(html, /Done for today/);
  assert.doesNotMatch(html, /Class in session|Leave by|Next class/);
});

test('ongoing class hides the expired leave time', () => {
  const html = renderToStaticMarkup(React.createElement(CommuteRadar, { nextClass: lecture, nowMinutes: 850 }));
  assert.match(html, /Class in session/);
  assert.match(html, /Current class/);
  assert.doesNotMatch(html, /Leave by:/);
});

test('departure time does not claim the user is travelling', () => {
  const html = renderToStaticMarkup(React.createElement(CommuteRadar, { nextClass: lecture, nowMinutes: 830 }));
  assert.match(html, /Departure time reached/);
  assert.doesNotMatch(html, /In Transit/);
  assert.match(html, /<details/);
});
