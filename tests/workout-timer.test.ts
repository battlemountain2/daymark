import { test } from "node:test";
import assert from "node:assert/strict";
import { restRemaining } from "../src/lib/workout-timer";
test("rest timer stays accurate after background suspension and never becomes negative", () => {
  const deadline = 100000 + 60000;
  assert.equal(restRemaining(deadline, 100000), 60);
  assert.equal(restRemaining(deadline, 145500), 15);
  assert.equal(restRemaining(deadline, 159001), 1);
  assert.equal(restRemaining(deadline, 160000), 0);
  assert.equal(restRemaining(deadline, 300000), 0);
});
