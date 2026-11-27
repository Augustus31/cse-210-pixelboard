import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_CELL,
  grid,
  gridWidth,
  gridHeight,
  isInGrid,
  getCell,
  setCell,
  setGridSize,
  subscribe,
} from '../src/canvas/main.js';

// The grid is shared module state, so each test starts from a known empty grid.
const START_WIDTH = 4;
const START_HEIGHT = 3;
const RED = '#ff0000ff';
const BLUE = '#0000ffff';

function resetGrid() {
  setGridSize(START_WIDTH, START_HEIGHT);
}

function expectSizeRejected(width, height) {
  resetGrid();
  setCell(0, 0, RED);
  const label = `setGridSize(${String(width)}, ${String(height)})`;
  assert.equal(setGridSize(width, height), false, `${label} should return false`);
  assert.equal(gridWidth, START_WIDTH, `${label} should not change the width`);
  assert.equal(gridHeight, START_HEIGHT, `${label} should not change the height`);
  assert.equal(getCell(0, 0), RED, `${label} should not change the cells`);
}


// start state tests (these must run before the first resetGrid call)

describe('start state', () => {
  test('the empty cell color has zero alpha', () => {
    assert.match(EMPTY_CELL, /^#[0-9a-f]{6}00$/);
  });

  test('the grid starts as 32 x 32', () => {
    assert.equal(gridWidth, 32);
    assert.equal(gridHeight, 32);
  });

  test('the grid has gridHeight rows and gridWidth columns', () => {
    assert.equal(grid.length, gridHeight);
    for (const cells of grid) {
      assert.equal(cells.length, gridWidth);
    }
  });

  test('all cells start empty', () => {
    for (const cells of grid) {
      for (const cell of cells) {
        assert.equal(cell, EMPTY_CELL);
      }
    }
  });
});


// isInGrid tests

describe('isInGrid', () => {
  test('the four corner cells are in the grid', () => {
    resetGrid();
    assert.equal(isInGrid(0, 0), true);
    assert.equal(isInGrid(0, START_WIDTH - 1), true);
    assert.equal(isInGrid(START_HEIGHT - 1, 0), true);
    assert.equal(isInGrid(START_HEIGHT - 1, START_WIDTH - 1), true);
  });

  test('a negative row or column is not in the grid', () => {
    resetGrid();
    assert.equal(isInGrid(-1, 0), false);
    assert.equal(isInGrid(0, -1), false);
  });

  test('a row or column one past the last is not in the grid', () => {
    resetGrid();
    assert.equal(isInGrid(START_HEIGHT, 0), false);
    assert.equal(isInGrid(0, START_WIDTH), false);
  });

  test('the row limit is the height and the column limit is the width', () => {
    // The grid is 4 wide and 3 high, so (0, 3) is in the grid and (3, 0) is not.
    resetGrid();
    assert.equal(isInGrid(0, 3), true);
    assert.equal(isInGrid(3, 0), false);
  });

  test('a value that is not a whole number is not in the grid', () => {
    resetGrid();
    for (const value of [0.5, NaN, Infinity, '1', null, undefined]) {
      assert.equal(isInGrid(value, 0), false, `row ${String(value)}`);
      assert.equal(isInGrid(0, value), false, `column ${String(value)}`);
    }
  });
});


// getCell tests

describe('getCell', () => {
  test('gives the empty color for a cell with no paint', () => {
    resetGrid();
    assert.equal(getCell(1, 2), EMPTY_CELL);
  });

  test('gives null for a cell that is not in the grid', () => {
    resetGrid();
    assert.equal(getCell(-1, 0), null);
    assert.equal(getCell(0, START_WIDTH), null);
    assert.equal(getCell(START_HEIGHT, 0), null);
    assert.equal(getCell(0.5, 0), null);
  });
});


// setCell tests

describe('setCell', () => {
  test('changes the color of the cell', () => {
    resetGrid();
    assert.equal(setCell(1, 2, RED), true);
    assert.equal(getCell(1, 2), RED);
  });

  test('changes only one cell', () => {
    resetGrid();
    setCell(1, 2, RED);
    for (let row = 0; row < START_HEIGHT; row++) {
      for (let column = 0; column < START_WIDTH; column++) {
        if (row === 1 && column === 2) continue;
        assert.equal(getCell(row, column), EMPTY_CELL, `cell (${row}, ${column})`);
      }
    }
  });

  test('the first number is the row and the second is the column', () => {
    resetGrid();
    setCell(2, 1, RED);
    assert.equal(getCell(2, 1), RED);
    assert.equal(getCell(1, 2), EMPTY_CELL);
  });

  test('a second call replaces the color', () => {
    resetGrid();
    setCell(0, 0, RED);
    setCell(0, 0, BLUE);
    assert.equal(getCell(0, 0), BLUE);
  });

  test('the empty color makes the cell empty again', () => {
    resetGrid();
    setCell(0, 0, RED);
    setCell(0, 0, EMPTY_CELL);
    assert.equal(getCell(0, 0), EMPTY_CELL);
  });

  test('a cell that is not in the grid is ignored', () => {
    resetGrid();
    assert.equal(setCell(-1, 0, RED), false);
    assert.equal(setCell(0, START_WIDTH, RED), false);
    assert.equal(setCell(START_HEIGHT, 0, RED), false);
    assert.equal(setCell(0.5, 0, RED), false);

    // no cell changed, and the grid did not get new rows or columns
    assert.equal(grid.length, START_HEIGHT);
    for (const cells of grid) {
      assert.equal(cells.length, START_WIDTH);
      for (const cell of cells) {
        assert.equal(cell, EMPTY_CELL);
      }
    }
  });
});


// setGridSize tests

describe('setGridSize', () => {
  test('changes the width and the height', () => {
    resetGrid();
    assert.equal(setGridSize(5, 2), true);
    assert.equal(gridWidth, 5);
    assert.equal(gridHeight, 2);
  });

  test('the new grid has the new number of rows and columns', () => {
    resetGrid();
    setGridSize(5, 2);
    assert.equal(grid.length, 2);
    for (const cells of grid) {
      assert.equal(cells.length, 5);
    }
  });

  test('all cells become empty', () => {
    resetGrid();
    setCell(0, 0, RED);
    setCell(2, 3, BLUE);
    setGridSize(START_WIDTH, START_HEIGHT);
    for (let row = 0; row < START_HEIGHT; row++) {
      for (let column = 0; column < START_WIDTH; column++) {
        assert.equal(getCell(row, column), EMPTY_CELL, `cell (${row}, ${column})`);
      }
    }
  });

  test('each row is a separate list', () => {
    // A grid that uses one list for all rows would paint a full column here.
    resetGrid();
    setCell(0, 0, RED);
    assert.equal(getCell(1, 0), EMPTY_CELL);
    assert.equal(getCell(2, 0), EMPTY_CELL);
  });

  test('a 1 x 1 grid is valid', () => {
    resetGrid();
    assert.equal(setGridSize(1, 1), true);
    assert.equal(isInGrid(0, 0), true);
    assert.equal(isInGrid(0, 1), false);
    assert.equal(isInGrid(1, 0), false);
  });

  test('the width and the height can be different', () => {
    resetGrid();
    setGridSize(2, 6);
    assert.equal(isInGrid(5, 1), true);
    assert.equal(isInGrid(1, 5), false);
  });

  test('zero is ignored', () => {
    expectSizeRejected(0, 3);
    expectSizeRejected(4, 0);
  });

  test('a negative size is ignored', () => {
    expectSizeRejected(-1, 3);
    expectSizeRejected(4, -1);
  });

  test('a size that is not a whole number is ignored', () => {
    for (const value of [1.5, NaN, Infinity, '8', null, undefined]) {
      expectSizeRejected(value, 3);
      expectSizeRejected(4, value);
    }
  });
});


// subscribe tests

describe('subscribe', () => {
  test('setCell calls the listener with the grid after the change', () => {
    resetGrid();
    const calls = [];
    const unsubscribe = subscribe((newGrid) => calls.push(newGrid[1][2]));
    setCell(1, 2, RED);
    assert.deepEqual(calls, [RED]);
    unsubscribe();
  });

  test('setCell with the same color does not call the listener', () => {
    resetGrid();
    setCell(1, 2, RED);
    let callCount = 0;
    const unsubscribe = subscribe(() => { callCount = callCount + 1; });
    assert.equal(setCell(1, 2, RED), true);
    assert.equal(callCount, 0);
    unsubscribe();
  });

  test('setCell for a cell that is not in the grid does not call the listener', () => {
    resetGrid();
    let callCount = 0;
    const unsubscribe = subscribe(() => { callCount = callCount + 1; });
    setCell(-1, 0, RED);
    setCell(0, START_WIDTH, RED);
    assert.equal(callCount, 0);
    unsubscribe();
  });

  test('setGridSize calls the listener with the new grid', () => {
    resetGrid();
    const sizes = [];
    const unsubscribe = subscribe((newGrid) => sizes.push([newGrid[0].length, newGrid.length]));
    setGridSize(5, 2);
    assert.deepEqual(sizes, [[5, 2]]);
    unsubscribe();
  });

  test('setGridSize with a size that is not valid does not call the listener', () => {
    resetGrid();
    let callCount = 0;
    const unsubscribe = subscribe(() => { callCount = callCount + 1; });
    setGridSize(0, 2);
    assert.equal(callCount, 0);
    unsubscribe();
  });

  test('all listeners are called', () => {
    resetGrid();
    let firstCount = 0;
    let secondCount = 0;
    const unsubscribeFirst = subscribe(() => { firstCount = firstCount + 1; });
    const unsubscribeSecond = subscribe(() => { secondCount = secondCount + 1; });
    setCell(0, 0, RED);
    assert.equal(firstCount, 1);
    assert.equal(secondCount, 1);
    unsubscribeFirst();
    unsubscribeSecond();
  });

  test('the function from subscribe stops the calls', () => {
    resetGrid();
    let callCount = 0;
    const unsubscribe = subscribe(() => { callCount = callCount + 1; });
    unsubscribe();
    setCell(0, 0, RED);
    setGridSize(5, 2);
    assert.equal(callCount, 0);
  });

  test('a listener that calls setCell with the same color does not make a loop', () => {
    resetGrid();
    let callCount = 0;
    const unsubscribe = subscribe(() => {
      callCount = callCount + 1;
      setCell(0, 0, RED);
    });
    setCell(0, 0, RED);
    assert.equal(callCount, 1);
    unsubscribe();
  });
});
