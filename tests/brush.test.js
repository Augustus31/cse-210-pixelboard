import test from 'node:test';
import assert from 'node:assert/strict';
import { brushCells, cellsInsideCanvas, maxBrushSize, clampBrushSize, outlineSegments } from '../src/brush.js';

const sortCells = (cells) => cells.map(([x, y]) => `${x},${y}`).sort();

test('size 1 changes only the cell under the pointer', () => {
  assert.deepEqual(brushCells(5, 7, 1, 'square'), [[5, 7]]);
  assert.deepEqual(brushCells(5, 7, 1, 'round'), [[5, 7]]);
});

test('size 2 gives the same 2 x 2 block for both shapes', () => {
  const square = sortCells(brushCells(5, 5, 2, 'square'));
  assert.equal(square.length, 4);
  assert.deepEqual(sortCells(brushCells(5, 5, 2, 'round')), square);
});

test('even sizes use a consistent offset: the pointer cell is the top-left of the center', () => {
  assert.deepEqual(sortCells(brushCells(5, 5, 2, 'square')), sortCells([[5, 5], [6, 5], [5, 6], [6, 6]]));
  const size4 = brushCells(10, 10, 4, 'square');
  assert.equal(Math.min(...size4.map(([x]) => x)), 9);
  assert.equal(Math.max(...size4.map(([x]) => x)), 12);
});

test('odd square sizes center on the pointer cell', () => {
  const cells = brushCells(10, 10, 3, 'square');
  assert.equal(cells.length, 9);
  assert.deepEqual(sortCells(cells), sortCells([
    [9, 9], [10, 9], [11, 9], [9, 10], [10, 10], [11, 10], [9, 11], [10, 11], [11, 11],
  ]));
});

test('round size 3 removes the four corner cells', () => {
  assert.deepEqual(sortCells(brushCells(10, 10, 3, 'round')), sortCells([
    [10, 9], [9, 10], [10, 10], [11, 10], [10, 11],
  ]));
});

test('round shape differs from square for every size of 3 and above', () => {
  for (let size = 3; size <= 16; size++) {
    const round = brushCells(20, 20, size, 'round');
    assert.ok(round.length < size * size, `size ${size} round should drop corners`);
    assert.ok(round.length > (size * size) / 2, `size ${size} round should still be mostly filled`);
    assert.ok(!round.some(([x, y]) => x === 20 - Math.floor((size - 1) / 2) && y === 20 - Math.floor((size - 1) / 2)));
  }
});

test('cellsInsideCanvas drops cells outside the canvas edge', () => {
  const cells = brushCells(0, 0, 3, 'square');
  assert.deepEqual(sortCells(cellsInsideCanvas(cells, 25)), sortCells([[0, 0], [1, 0], [0, 1], [1, 1]]));
  const bottomRight = cellsInsideCanvas(brushCells(24, 24, 3, 'square'), 25);
  assert.deepEqual(sortCells(bottomRight), sortCells([[23, 23], [24, 23], [23, 24], [24, 24]]));
});

test('maximum brush size is a quarter of the canvas size, rounded down', () => {
  assert.equal(maxBrushSize(25), 6);
  assert.equal(maxBrushSize(40), 10);
  assert.equal(maxBrushSize(64), 16);
});

test('clampBrushSize keeps sizes between 1 and the maximum', () => {
  assert.equal(clampBrushSize(0, 25, 3), 1);
  assert.equal(clampBrushSize(-4, 25, 3), 1);
  assert.equal(clampBrushSize(99, 25, 3), 6);
  assert.equal(clampBrushSize(4, 25, 3), 4);
  assert.equal(clampBrushSize(4.6, 25, 3), 5);
});

test('clampBrushSize returns the last valid size for non-numbers', () => {
  assert.equal(clampBrushSize('abc', 64, 3), 3);
  assert.equal(clampBrushSize('', 64, 7), 7);
  assert.equal(clampBrushSize(NaN, 64, 2), 2);
  assert.equal(clampBrushSize('5', 64, 2), 5);
});

test('outline of one cell is its four edges', () => {
  assert.deepEqual(outlineSegments([[2, 3]]).sort(), [
    [2, 3, 3, 3], [2, 4, 3, 4], [2, 3, 2, 4], [3, 3, 3, 4],
  ].sort());
});

test('outline skips edges shared by two footprint cells', () => {
  const segments = outlineSegments(brushCells(5, 5, 2, 'square'));
  assert.equal(segments.length, 8);
  assert.ok(!segments.some(([x1, y1, x2, y2]) => x1 === 6 && x2 === 6 && y1 === 5 && y2 === 6));
});
