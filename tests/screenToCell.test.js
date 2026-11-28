import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { setGridSize } from '../src/canvas/main.js';
import { screenToCell } from '../src/canvas/screenToCell.js';

// The grid is shared module state, so each test starts from a known grid size.
// The canvas is 4 x 3 cells and each cell is 10 x 10 on screen.
const START_WIDTH = 4;
const START_HEIGHT = 3;
const RECT = { left: 100, top: 50, width: 40, height: 30 };

function cellAt(clientX, clientY, rect = RECT) {
  setGridSize(START_WIDTH, START_HEIGHT);
  return screenToCell(clientX, clientY, rect);
}

describe('screenToCell', () => {
  test('the top left corner of the canvas is cell (0, 0)', () => {
    assert.deepEqual(cellAt(100, 50), { row: 0, column: 0 });
  });

  test('X gives the column and Y gives the row', () => {
    assert.deepEqual(cellAt(135, 55), { row: 0, column: 3 });
    assert.deepEqual(cellAt(105, 75), { row: 2, column: 0 });
  });

  test('all positions inside one cell give that cell', () => {
    assert.deepEqual(cellAt(110, 60), { row: 1, column: 1 });
    assert.deepEqual(cellAt(115.5, 64.2), { row: 1, column: 1 });
    assert.deepEqual(cellAt(119.9, 69.9), { row: 1, column: 1 });
  });

  test('a position on a cell edge gives the cell to the right and below', () => {
    assert.deepEqual(cellAt(120, 70), { row: 2, column: 2 });
  });

  test('a position left of or above the canvas gives a negative cell', () => {
    assert.deepEqual(cellAt(99, 49), { row: -1, column: -1 });
    assert.deepEqual(cellAt(85, 50), { row: 0, column: -2 });
  });

  test('a position right of or below the canvas gives a cell past the last cell', () => {
    assert.deepEqual(cellAt(140, 80), { row: 3, column: 4 });
  });

  test('the cell size comes from the canvas size on screen', () => {
    // The same canvas at 2x zoom: each cell is 20 x 20 on screen
    const zoomedRect = { left: 100, top: 50, width: 80, height: 60 };
    assert.deepEqual(cellAt(110, 60, zoomedRect), { row: 0, column: 0 });
    assert.deepEqual(cellAt(125, 95, zoomedRect), { row: 2, column: 1 });
  });

  test('a cell size that is not a whole number works', () => {
    // 4 columns in 30 pixels: each cell is 7.5 wide
    const narrowRect = { left: 0, top: 0, width: 30, height: 30 };
    assert.equal(cellAt(7, 0, narrowRect).column, 0);
    assert.equal(cellAt(8, 0, narrowRect).column, 1);
    assert.equal(cellAt(29, 0, narrowRect).column, 3);
  });

  test('the cell uses the current grid size', () => {
    setGridSize(8, 6);
    assert.deepEqual(screenToCell(135, 75, RECT), { row: 5, column: 7 });
  });
});
