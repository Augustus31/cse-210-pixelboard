import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  setGridSize, setCell, setCells, getCell, subscribe, EMPTY_CELL,
} from '../src/canvas/main.js';
import { color, setColor } from '../src/color/main.js';
import {
  setTool, setStrokeSize, setStrokeShape, toolDown, toolMove,
} from '../src/canvas/tools/main.js';

// Shared module state: each test starts from an empty 6 x 5 grid and a red size 1 stroke.
const RED = '#ff0000ff';
const BLUE = '#0000ffff';

function start(toolName) {
  setGridSize(6, 5);
  setColor(RED);
  setStrokeSize(1);
  setStrokeShape('square');
  setTool(toolName);
}

/** Counts the cells of the grid that have a given color. */
function countCells(cellColor) {
  let count = 0;
  for (let row = 0; row < 5; row++) {
    for (let column = 0; column < 6; column++) {
      if (getCell(row, column) === cellColor) count = count + 1;
    }
  }
  return count;
}

test('setCells changes each cell and calls the subscribers one time only', () => {
  setGridSize(6, 5);
  let callCount = 0;
  const unsubscribe = subscribe(() => { callCount = callCount + 1; });
  const cells = [{ row: 0, column: 0 }, { row: 1, column: 2 }, { row: -1, column: 0 }];
  assert.equal(setCells(cells, RED), 2);
  assert.equal(countCells(RED), 2);
  assert.equal(callCount, 1);
  unsubscribe();
});

describe('pencil', () => {
  test('pointer down paints one stamp with the central color', () => {
    start('pencil');
    setStrokeSize(3);
    toolDown({ row: 2, column: 2 });
    assert.equal(countCells(RED), 9);
  });

  test('pointer move paints the line between the two cells', () => {
    start('pencil');
    toolMove({ row: 1, column: 0 }, { row: 1, column: 4 });
    assert.equal(countCells(RED), 5);
  });
});

describe('eraser', () => {
  test('pointer down makes the cell empty and keeps the central color', () => {
    start('eraser');
    setCell(2, 3, BLUE);
    toolDown({ row: 2, column: 3 });
    assert.equal(getCell(2, 3), EMPTY_CELL);
    assert.equal(color, RED);
  });
});

describe('eyedropper', () => {
  test('pointer down makes the cell color the central color and keeps the grid', () => {
    start('eyedropper');
    setCell(2, 3, BLUE);
    toolDown({ row: 2, column: 3 });
    assert.equal(color, BLUE);
    assert.equal(countCells(BLUE), 1);
  });

  test('a cell outside the grid keeps the central color', () => {
    start('eyedropper');
    toolDown({ row: -1, column: 0 });
    assert.equal(color, RED);
  });
});

describe('fill', () => {
  test('a wall of a different color stops the fill', () => {
    start('fill');
    for (let row = 0; row < 5; row++) {
      setCell(row, 2, BLUE);
    }
    toolDown({ row: 0, column: 0 });
    assert.equal(countCells(RED), 10);
    assert.equal(countCells(BLUE), 5);
  });

  test('pointer move does not fill', () => {
    start('fill');
    toolMove({ row: 0, column: 0 }, { row: 2, column: 3 });
    assert.equal(countCells(RED), 0);
  });
});
