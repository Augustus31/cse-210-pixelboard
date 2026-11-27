import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setGridSize, setCell, EMPTY_CELL, DEFAULT_CELL_SIZE } from '../src/canvas/main.js';
import { createCanvas } from '../src/canvas/UI/canvasUI.js';

// The grid is shared module state, so each test starts from a known empty grid.
const START_WIDTH = 4;
const START_HEIGHT = 3;
const RED = '#ff0000ff';
const HALF_BLUE = '#0000ff80';

/** A stand-in for a 2D drawing context. It records the calls. */
class FakeContext {
  constructor() {
    this.fillStyle = '';
    this.cleared = [];
    this.filled = [];
  }

  clearRect(x, y, width, height) {
    this.cleared.push({ x, y, width, height });
    this.filled = [];
  }

  fillRect(x, y, width, height) {
    this.filled.push({ x, y, width, height, color: this.fillStyle });
  }
}

/** A stand-in for a canvas element. Node has no DOM, so the tests use this. */
class FakeElement {
  constructor() {
    this.children = [];
    this.attributes = {};
    this.style = {};
    this.parent = null;
    this.width = 300;
    this.height = 150;
    this.context = new FakeContext();
  }

  getContext() {
    return this.context;
  }

  append(child) {
    this.children.push(child);
    child.parent = this;
  }

  remove() {
    if (this.parent === null) return;
    this.parent.children = this.parent.children.filter((child) => child !== this);
    this.parent = null;
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }
}

const container = new FakeElement();

before(() => {
  globalThis.document = {
    createElement: () => new FakeElement(),
    querySelector: (selector) => {
      if (selector === '#stage') return container;
      return null;
    },
  };
});

after(() => {
  delete globalThis.document;
});

function makeCanvas(options) {
  setGridSize(START_WIDTH, START_HEIGHT);
  container.children = [];
  return createCanvas('#stage', options);
}

describe('createCanvas setup', () => {
  test('the canvas is put in the container from a CSS selector', () => {
    const { element, destroy } = makeCanvas();
    assert.deepEqual(container.children, [element]);
    destroy();
  });

  test('the canvas is in grid area 1 / 1, the same as the checkerboard', () => {
    const { element, destroy } = makeCanvas();
    assert.equal(element.style.gridArea, '1 / 1');
    destroy();
  });

  test('the canvas has sharp cell edges and no background', () => {
    const { element, destroy } = makeCanvas();
    assert.equal(element.style.imageRendering, 'pixelated');
    assert.equal(element.style.background, undefined);
    assert.equal(element.style.backgroundColor, undefined);
    destroy();
  });
});

describe('canvas size', () => {
  test('the canvas has one canvas pixel for each cell', () => {
    const { element, destroy } = makeCanvas();
    assert.equal(element.width, START_WIDTH);
    assert.equal(element.height, START_HEIGHT);
    destroy();
  });

  test('the size on screen is the grid size times the default cell size', () => {
    const { element, destroy } = makeCanvas();
    assert.equal(element.style.width, `${START_WIDTH * DEFAULT_CELL_SIZE}px`);
    assert.equal(element.style.height, `${START_HEIGHT * DEFAULT_CELL_SIZE}px`);
    destroy();
  });

  test('the cellSize option sets the size of one cell on screen only', () => {
    const { element, destroy } = makeCanvas({ cellSize: 10 });
    assert.equal(element.style.width, '40px');
    assert.equal(element.style.height, '30px');
    assert.equal(element.width, START_WIDTH);
    assert.equal(element.height, START_HEIGHT);
    destroy();
  });

  test('a new grid size shows with no call to draw()', () => {
    const { element, destroy } = makeCanvas({ cellSize: 10 });
    setGridSize(8, 2);
    assert.equal(element.width, 8);
    assert.equal(element.height, 2);
    assert.equal(element.style.width, '80px');
    assert.equal(element.style.height, '20px');
    destroy();
  });
});

describe('canvas drawing', () => {
  test('an empty grid paints no cells', () => {
    const { element, destroy } = makeCanvas();
    assert.deepEqual(element.context.filled, []);
    destroy();
  });

  test('each cell that has a color is painted as a 1 x 1 square', () => {
    // The column is x and the row is y.
    const { element, destroy } = makeCanvas();
    setCell(1, 2, RED);
    setCell(2, 0, HALF_BLUE);
    assert.deepEqual(element.context.filled, [
      { x: 2, y: 1, width: 1, height: 1, color: RED },
      { x: 0, y: 2, width: 1, height: 1, color: HALF_BLUE },
    ]);
    destroy();
  });

  test('a cell that becomes empty is not painted', () => {
    const { element, destroy } = makeCanvas();
    setCell(1, 2, RED);
    setCell(1, 2, EMPTY_CELL);
    assert.deepEqual(element.context.filled, []);
    destroy();
  });

  test('draw() clears the full canvas before it paints', () => {
    const { element, draw, destroy } = makeCanvas();
    setCell(1, 2, HALF_BLUE);
    draw();
    draw();
    const lastClear = element.context.cleared[element.context.cleared.length - 1];
    assert.deepEqual(lastClear, { x: 0, y: 0, width: START_WIDTH, height: START_HEIGHT });

    // The cell is painted one time only, so a color with alpha does not get darker
    assert.equal(element.context.filled.length, 1);
    destroy();
  });
});

describe('destroy', () => {
  test('removes the canvas from the container', () => {
    const { destroy } = makeCanvas();
    destroy();
    assert.deepEqual(container.children, []);
  });

  test('stops the drawing when the grid changes', () => {
    const { element, destroy } = makeCanvas();
    destroy();
    setCell(1, 2, RED);
    assert.deepEqual(element.context.filled, []);
  });
});
