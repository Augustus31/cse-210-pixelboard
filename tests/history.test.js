import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_CELL, gridWidth, gridHeight, getCell, setCell, setGridSize, clearGrid,
} from '../src/canvas/main.js';
import {
  MAX_STEPS, beginStep, endStep, undo, redo, canUndo, canRedo, clearHistory, subscribe,
} from '../src/canvas/history.js';

// The grid and the history are shared module state, so each test starts from a known state.
const START_WIDTH = 4;
const START_HEIGHT = 3;
const RED = '#ff0000ff';
const BLUE = '#0000ffff';

function reset() {
  setGridSize(START_WIDTH, START_HEIGHT);
  clearHistory();
}

/** Does one step that paints one cell. */
function paintStep(row, column, cellColor) {
  beginStep();
  setCell(row, column, cellColor);
  return endStep();
}

describe('start state', () => {
  test('there is nothing to undo or redo', () => {
    reset();
    assert.equal(canUndo(), false);
    assert.equal(canRedo(), false);
    assert.equal(undo(), false);
    assert.equal(redo(), false);
  });
});

describe('steps', () => {
  test('a step that changes the grid is kept', () => {
    reset();
    assert.equal(paintStep(0, 0, RED), true);
    assert.equal(canUndo(), true);
  });

  test('a step that does not change the grid is not kept', () => {
    reset();
    beginStep();
    assert.equal(endStep(), false);
    assert.equal(canUndo(), false);
  });

  test('endStep without beginStep does nothing', () => {
    reset();
    setCell(0, 0, RED);
    assert.equal(endStep(), false);
    assert.equal(canUndo(), false);
  });

  test('many cell changes in one step are one undo', () => {
    reset();
    beginStep();
    setCell(0, 0, RED);
    setCell(0, 1, RED);
    setCell(0, 2, RED);
    endStep();
    undo();
    assert.equal(getCell(0, 0), EMPTY_CELL);
    assert.equal(getCell(0, 1), EMPTY_CELL);
    assert.equal(getCell(0, 2), EMPTY_CELL);
    assert.equal(canUndo(), false);
  });

  test('a second beginStep keeps the first copy', () => {
    reset();
    beginStep();
    setCell(0, 0, RED);
    beginStep();
    setCell(0, 1, RED);
    endStep();
    undo();
    assert.equal(getCell(0, 0), EMPTY_CELL);
    assert.equal(getCell(0, 1), EMPTY_CELL);
  });
});

describe('undo and redo', () => {
  test('undo puts the grid back', () => {
    reset();
    paintStep(1, 1, RED);
    assert.equal(undo(), true);
    assert.equal(getCell(1, 1), EMPTY_CELL);
  });

  test('redo does the step again', () => {
    reset();
    paintStep(1, 1, RED);
    undo();
    assert.equal(redo(), true);
    assert.equal(getCell(1, 1), RED);
  });

  test('steps are undone from the newest to the oldest', () => {
    reset();
    paintStep(0, 0, RED);
    paintStep(0, 0, BLUE);
    undo();
    assert.equal(getCell(0, 0), RED);
    undo();
    assert.equal(getCell(0, 0), EMPTY_CELL);
    redo();
    assert.equal(getCell(0, 0), RED);
    redo();
    assert.equal(getCell(0, 0), BLUE);
  });

  test('a new step removes the redo steps', () => {
    reset();
    paintStep(0, 0, RED);
    undo();
    paintStep(1, 1, BLUE);
    assert.equal(canRedo(), false);
    assert.equal(redo(), false);
    assert.equal(getCell(0, 0), EMPTY_CELL);
  });

  test('erase all is one step', () => {
    reset();
    paintStep(0, 0, RED);
    paintStep(2, 3, BLUE);
    beginStep();
    clearGrid();
    endStep();
    undo();
    assert.equal(getCell(0, 0), RED);
    assert.equal(getCell(2, 3), BLUE);
  });

  test('undo and redo do nothing while a step is open', () => {
    reset();
    paintStep(0, 0, RED);
    beginStep();
    assert.equal(undo(), false);
    assert.equal(getCell(0, 0), RED);
    endStep();
    undo();
    beginStep();
    assert.equal(redo(), false);
    endStep();
  });

  test('undo puts back the grid size of the step', () => {
    reset();
    beginStep();
    setGridSize(2, 2);
    endStep();
    undo();
    assert.equal(gridWidth, START_WIDTH);
    assert.equal(gridHeight, START_HEIGHT);
  });

  test('redo after an undo of a size change puts the new size back', () => {
    reset();
    beginStep();
    setGridSize(2, 2);
    endStep();
    undo();
    redo();
    assert.equal(gridWidth, 2);
    assert.equal(gridHeight, 2);
  });

  test('undo changes only the cells of the step', () => {
    reset();
    paintStep(0, 0, RED);
    paintStep(2, 3, BLUE);
    undo();
    assert.equal(getCell(0, 0), RED);
    assert.equal(getCell(2, 3), EMPTY_CELL);
    redo();
    assert.equal(getCell(0, 0), RED);
    assert.equal(getCell(2, 3), BLUE);
  });

  test('only the newest MAX_STEPS steps are kept', () => {
    reset();
    const colors = [RED, BLUE];
    for (let index = 0; index < MAX_STEPS + 5; index++) {
      paintStep(0, 0, colors[index % 2]);
    }
    let undoCount = 0;
    while (undo()) {
      undoCount = undoCount + 1;
    }
    assert.equal(undoCount, MAX_STEPS);
  });
});

describe('clearHistory', () => {
  test('removes the undo and redo steps', () => {
    reset();
    paintStep(0, 0, RED);
    paintStep(0, 1, RED);
    undo();
    clearHistory();
    assert.equal(canUndo(), false);
    assert.equal(canRedo(), false);
  });

  test('does not change the grid', () => {
    reset();
    paintStep(0, 0, RED);
    clearHistory();
    assert.equal(getCell(0, 0), RED);
  });

  test('closes an open step', () => {
    reset();
    beginStep();
    setCell(0, 0, RED);
    clearHistory();
    assert.equal(endStep(), false);
    assert.equal(canUndo(), false);
  });
});

describe('subscribe', () => {
  test('the listener gets the state after each change', () => {
    reset();
    const states = [];
    const unsubscribe = subscribe((state) => states.push(state));
    paintStep(0, 0, RED);
    undo();
    redo();
    clearHistory();
    unsubscribe();
    assert.deepEqual(states, [
      { canUndo: true, canRedo: false },
      { canUndo: false, canRedo: true },
      { canUndo: true, canRedo: false },
      { canUndo: false, canRedo: false },
    ]);
  });

  test('a step that is not kept does not call the listener', () => {
    reset();
    let callCount = 0;
    const unsubscribe = subscribe(() => {
      callCount = callCount + 1;
    });
    beginStep();
    endStep();
    undo();
    clearHistory();
    unsubscribe();
    assert.equal(callCount, 0);
  });

  test('the function from subscribe stops the calls', () => {
    reset();
    let callCount = 0;
    const unsubscribe = subscribe(() => {
      callCount = callCount + 1;
    });
    unsubscribe();
    paintStep(0, 0, RED);
    assert.equal(callCount, 0);
  });
});
