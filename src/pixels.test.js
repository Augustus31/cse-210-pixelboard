import test from 'node:test';
import assert from 'node:assert/strict';
import { linePixels } from './pixels.js';

test('fast pointer movement paints every horizontal pixel', () => {
  assert.deepEqual(linePixels([0, 0], [4, 0]), [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]);
});
test('diagonal and reversed strokes remain continuous in every direction', () => {
  for (const end of [[63, 21], [21, 63], [0, 0], [0, 63], [63, 0]]) {
    const points = linePixels([32, 32], end);
    assert.deepEqual(points[0], [32, 32]);
    assert.deepEqual(points.at(-1), end);
    points.slice(1).forEach((point, index) => {
      assert.equal(Math.max(...point.map((value, axis) => Math.abs(value - points[index][axis]))), 1);
    });
  }
});
test('a single click paints one pixel', () => {
  assert.deepEqual(linePixels([12, 9], [12, 9]), [[12, 9]]);
});
