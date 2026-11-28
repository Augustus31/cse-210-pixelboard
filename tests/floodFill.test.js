import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { setGridSize, setCell, getCell } from '../src/canvas/main.js';
import { floodCells } from '../src/canvas/floodFill.js';

// The grid is shared module state, so each test starts from a known empty grid.
const START_WIDTH = 5;
const START_HEIGHT = 4;
const RED = '#ff0000ff';
const BLUE = '#0000ffff';

function resetGrid() {
  setGridSize(START_WIDTH, START_HEIGHT);
}

/** Changes a list of cells to a sorted list of 'row,column' text. */
function asSortedText(cells) {
  const texts = [];
  for (const cell of cells) {
    texts.push(`${cell.row},${cell.column}`);
  }
  return texts.sort();
}

/** Paints a red wall in column 2, from the top row to the bottom row. */
function paintWall() {
  for (let row = 0; row < START_HEIGHT; row++) {
    setCell(row, 2, RED);
  }
}

describe('floodCells', () => {
  test('an empty grid gives all cells', () => {
    resetGrid();
    assert.equal(floodCells(1, 1).length, START_WIDTH * START_HEIGHT);
  });

  test('the area has the start cell', () => {
    resetGrid();
    paintWall();
    assert.ok(asSortedText(floodCells(1, 0)).includes('1,0'));
  });

  test('a wall of a different color stops the area', () => {
    resetGrid();
    paintWall();
    assert.deepEqual(asSortedText(floodCells(1, 0)), [
      '0,0', '0,1', '1,0', '1,1', '2,0', '2,1', '3,0', '3,1',
    ]);
  });

  test('a start cell on the wall gives the wall', () => {
    resetGrid();
    paintWall();
    assert.deepEqual(asSortedText(floodCells(0, 2)), ['0,2', '1,2', '2,2', '3,2']);
  });

  test('a gap in the wall lets the area go through', () => {
    resetGrid();
    paintWall();
    setCell(3, 2, '#00000000');
    assert.equal(floodCells(1, 0).length, START_WIDTH * START_HEIGHT - 3);
  });

  test('cells that touch only at a corner are not connected', () => {
    resetGrid();
    setCell(0, 0, RED);
    setCell(1, 1, RED);
    assert.deepEqual(asSortedText(floodCells(0, 0)), ['0,0']);
  });

  test('a cell of a different color in the area is not in the list', () => {
    resetGrid();
    setCell(1, 1, BLUE);
    const cells = asSortedText(floodCells(0, 0));
    assert.equal(cells.length, START_WIDTH * START_HEIGHT - 1);
    assert.equal(cells.includes('1,1'), false);
  });

  test('each cell is in the list one time only', () => {
    resetGrid();
    const texts = asSortedText(floodCells(2, 2));
    assert.equal(texts.length, new Set(texts).size);
  });

  test('a start cell that is not in the grid gives an empty list', () => {
    resetGrid();
    assert.deepEqual(floodCells(-1, 0), []);
    assert.deepEqual(floodCells(0, START_WIDTH), []);
  });

  test('the function does not change the grid', () => {
    resetGrid();
    paintWall();
    floodCells(1, 0);
    assert.equal(getCell(1, 0), '#00000000');
    assert.equal(getCell(1, 2), RED);
  });
});
