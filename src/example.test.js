// Example tests that show how a test file is written and how a failure looks
import assert from "node:assert/strict";
import { test } from "node:test";

test("1 + 1 equals 2", () => {
  assert.equal(1 + 1, 2);
});

// This one fails on purpose
test("1 + 1 equals 3", () => {
  assert.equal(1 + 1, 3);
});
