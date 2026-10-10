import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyQueued } from '../src/lib/apply';
import type { State } from '../src/lib/db';

test('an acknowledged snapshot retains later offline edits in replay order', () => {
  const server: State = { ticks: {}, dismissed: [], todos: [{ id: 'local-first', title: 'First task', due: '2026-10-09', done: false }] };
  const remaining = [
    { body: { action: 'addTodo', id: 'local-second', title: 'Second task', due: '2026-10-09' } },
    { body: { action: 'todoDone', id: 'local-first', done: true } },
    { body: { action: 'tick', key: 'assignment', done: true } },
    { body: { action: 'tick', key: 'assignment', done: false } },
  ];
  const result = applyQueued(server, remaining);
  assert.equal(result.todos.length, 2);
  assert.equal(result.todos[0].done, true);
  assert.equal(result.ticks.assignment, false);
  assert.equal(server.todos.length, 1);
  assert.equal(server.todos[0].done, false);
});
test('a queued create followed by delete never resurrects the local task', () => {
  const result = applyQueued({ ticks: {}, dismissed: [], todos: [] }, [
    { body: { action: 'addTodo', id: 'local-task', title: 'Task', due: '2026-10-09' } },
    { body: { action: 'deleteTodo', id: 'local-task' } },
  ]);
  assert.deepEqual(result.todos, []);
});
