import test from 'node:test';
import assert from 'node:assert/strict';
import { linePixels, colorAtCell } from '../src/pixels.js';

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

test('colorAtCell reads the color of the cell at a column and row', () => {
  const pixels = ['#ffffff', '#111111', '#222222', '#333333'];
  assert.equal(colorAtCell(pixels, 2, [1, 0]), '#111111');
  assert.equal(colorAtCell(pixels, 2, [0, 1]), '#222222');
});
test('colorAtCell picks white cells like any other color', () => {
  assert.equal(colorAtCell(['#ffffff', '#000000', '#000000', '#000000'], 2, [0, 0]), '#ffffff');
});
test('colorAtCell returns null for a cell outside the canvas', () => {
  const pixels = Array(4).fill('#123456');
  for (const point of [[-1, 0], [0, -1], [2, 0], [0, 2]]) assert.equal(colorAtCell(pixels, 2, point), null);
});
