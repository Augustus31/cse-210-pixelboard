import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { setGridSize, getCell, EMPTY_CELL } from '../src/canvas/main.js';
import { setTool, setStrokeSize, setStrokeShape } from '../src/canvas/tools/main.js';
import { setColor } from '../src/color/main.js';
import { createPointerInput } from '../src/canvas/UI/pointerInputUI.js';

// A 4 x 4 grid shown as 40 x 40 screen pixels at (100, 200): one cell is 10 pixels.
const GRID_SIZE = 4;
const CANVAS_RECT = { left: 100, top: 200, width: 40, height: 40 };
const BLACK = '#000000ff';

/** A stand-in for the stage element. Node has no DOM, so the tests use this. */
class FakeTarget extends EventTarget {
  constructor() {
    super();
    this.capturedPointerIds = [];
  }

  setPointerCapture(pointerId) {
    this.capturedPointerIds.push(pointerId);
  }
}

/** Gives the screen position of the center of a cell. */
function cellCenter(row, column) {
  const clientX = CANVAS_RECT.left + column * 10 + 5;
  const clientY = CANVAS_RECT.top + row * 10 + 5;
  return { clientX, clientY };
}

/** Sends one pointer event for a cell to the target. */
function sendPointer(target, type, row, column, { button = 0, pointerId = 1 } = {}) {
  const event = new Event(type);
  const position = cellCenter(row, column);
  event.clientX = position.clientX;
  event.clientY = position.clientY;
  event.button = button;
  event.pointerId = pointerId;
  target.dispatchEvent(event);
}

/** Each test starts with an empty grid, the pencil, and a new pointer input. */
function setUp(options = {}) {
  setGridSize(GRID_SIZE, GRID_SIZE);
  setTool('pencil');
  setStrokeSize(1);
  setStrokeShape('square');
  setColor('#000000');

  const target = new FakeTarget();
  const pointerInput = createPointerInput(target, {
    getCanvasRect: () => CANVAS_RECT,
    ...options,
  });
  return { target, pointerInput };
}

describe('stroke', () => {
  test('pointer down paints the cell below the pointer', () => {
    const { target, pointerInput } = setUp();
    sendPointer(target, 'pointerdown', 1, 2);
    assert.equal(getCell(1, 2), BLACK);
    assert.equal(getCell(0, 0), EMPTY_CELL);
    pointerInput.destroy();
  });

  test('pointer down captures the pointer', () => {
    const { target, pointerInput } = setUp();
    sendPointer(target, 'pointerdown', 0, 0, { pointerId: 7 });
    assert.deepEqual(target.capturedPointerIds, [7]);
    pointerInput.destroy();
  });

  test('pointer move paints a line from the last cell', () => {
    const { target, pointerInput } = setUp();
    sendPointer(target, 'pointerdown', 0, 0);
    sendPointer(target, 'pointermove', 0, 3);
    for (let column = 0; column < GRID_SIZE; column++) {
      assert.equal(getCell(0, column), BLACK);
    }
    pointerInput.destroy();
  });

  test('pointer move without pointer down does not paint', () => {
    const { target, pointerInput } = setUp();
    sendPointer(target, 'pointermove', 1, 1);
    assert.equal(getCell(1, 1), EMPTY_CELL);
    pointerInput.destroy();
  });

  test('pointer up stops the stroke', () => {
    const { target, pointerInput } = setUp();
    sendPointer(target, 'pointerdown', 0, 0);
    sendPointer(target, 'pointerup', 0, 0);
    sendPointer(target, 'pointermove', 3, 3);
    assert.equal(getCell(3, 3), EMPTY_CELL);
    assert.equal(pointerInput.isStrokeActive(), false);
    pointerInput.destroy();
  });

  test('pointer cancel stops the stroke', () => {
    const { target, pointerInput } = setUp();
    sendPointer(target, 'pointerdown', 0, 0);
    sendPointer(target, 'pointercancel', 0, 0);
    sendPointer(target, 'pointermove', 3, 3);
    assert.equal(getCell(3, 3), EMPTY_CELL);
    pointerInput.destroy();
  });

  test('a button that is not the main button does not start a stroke', () => {
    const { target, pointerInput } = setUp();
    sendPointer(target, 'pointerdown', 1, 1, { button: 2 });
    assert.equal(getCell(1, 1), EMPTY_CELL);
    assert.equal(pointerInput.isStrokeActive(), false);
    pointerInput.destroy();
  });

  test('a second pointer is ignored during a stroke', () => {
    const { target, pointerInput } = setUp();
    sendPointer(target, 'pointerdown', 0, 0, { pointerId: 1 });
    sendPointer(target, 'pointerdown', 3, 3, { pointerId: 2 });
    sendPointer(target, 'pointermove', 3, 0, { pointerId: 2 });
    sendPointer(target, 'pointerup', 3, 0, { pointerId: 2 });
    assert.equal(getCell(3, 3), EMPTY_CELL);
    assert.equal(getCell(3, 0), EMPTY_CELL);
    assert.equal(pointerInput.isStrokeActive(), true);
    pointerInput.destroy();
  });

  test('a stroke can go outside the grid and come back', () => {
    const { target, pointerInput } = setUp();
    sendPointer(target, 'pointerdown', 0, -2);
    sendPointer(target, 'pointermove', 0, 1);
    assert.equal(getCell(0, 0), BLACK);
    assert.equal(getCell(0, 1), BLACK);
    pointerInput.destroy();
  });
});

describe('callbacks', () => {
  test('onHover gets the cell for each pointer move', () => {
    const hoverCells = [];
    const { target, pointerInput } = setUp({ onHover: (cell) => hoverCells.push(cell) });
    sendPointer(target, 'pointermove', 2, 3);
    sendPointer(target, 'pointermove', 5, -1);
    assert.deepEqual(hoverCells, [{ row: 2, column: 3 }, { row: 5, column: -1 }]);
    assert.equal(getCell(2, 3), EMPTY_CELL);
    pointerInput.destroy();
  });

  test('onStrokeStart is called before the first paint', () => {
    let colorAtStart = null;
    const { target, pointerInput } = setUp({
      onStrokeStart: () => {
        colorAtStart = getCell(1, 1);
      },
    });
    sendPointer(target, 'pointerdown', 1, 1);
    assert.equal(colorAtStart, EMPTY_CELL);
    assert.equal(getCell(1, 1), BLACK);
    pointerInput.destroy();
  });

  test('onStrokeEnd is called one time at pointer up', () => {
    let endCount = 0;
    const { target, pointerInput } = setUp({
      onStrokeEnd: () => {
        endCount = endCount + 1;
      },
    });
    sendPointer(target, 'pointerdown', 1, 1);
    assert.equal(endCount, 0);
    sendPointer(target, 'pointerup', 1, 1);
    sendPointer(target, 'pointerup', 1, 1);
    assert.equal(endCount, 1);
    pointerInput.destroy();
  });
});

describe('destroy', () => {
  test('after destroy, pointer events do not paint', () => {
    const { target, pointerInput } = setUp();
    pointerInput.destroy();
    sendPointer(target, 'pointerdown', 1, 1);
    assert.equal(getCell(1, 1), EMPTY_CELL);
  });

  test('destroy stops an active stroke and calls onStrokeEnd', () => {
    let endCount = 0;
    const { target, pointerInput } = setUp({
      onStrokeEnd: () => {
        endCount = endCount + 1;
      },
    });
    sendPointer(target, 'pointerdown', 1, 1);
    pointerInput.destroy();
    assert.equal(endCount, 1);
    assert.equal(pointerInput.isStrokeActive(), false);
  });
});
