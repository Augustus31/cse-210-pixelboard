import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setGridSize, DEFAULT_CELL_SIZE } from '../src/canvas/main.js';
import {
  createCheckerboard,
  DEFAULT_CHECKER_LIGHT,
  DEFAULT_CHECKER_DARK,
} from '../src/canvas/UI/checkerboardUI.js';

// The grid is shared module state, so each test starts from a known grid size.
const START_WIDTH = 4;
const START_HEIGHT = 3;

/** A stand-in for a DOM element. Node has no DOM, so the tests use this. */
class FakeElement {
  constructor() {
    this.children = [];
    this.attributes = {};
    this.style = {};
    this.parent = null;
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

function makeCheckerboard(options) {
  setGridSize(START_WIDTH, START_HEIGHT);
  container.children = [];
  return createCheckerboard('#stage', options);
}

describe('createCheckerboard setup', () => {
  test('the checkerboard is put in the container from a CSS selector', () => {
    const { element, destroy } = makeCheckerboard();
    assert.deepEqual(container.children, [element]);
    destroy();
  });

  test('the checkerboard is put in a given element', () => {
    setGridSize(START_WIDTH, START_HEIGHT);
    const holder = new FakeElement();
    const { element, destroy } = createCheckerboard(holder);
    assert.deepEqual(holder.children, [element]);
    destroy();
  });

  test('the checkerboard is in grid area 1 / 1, the same as the canvas', () => {
    const { element, destroy } = makeCheckerboard();
    assert.equal(element.style.gridArea, '1 / 1');
    destroy();
  });
});

describe('checkerboard size', () => {
  test('the size on screen is the grid size times the default cell size', () => {
    const { element, destroy } = makeCheckerboard();
    assert.equal(element.style.width, `${START_WIDTH * DEFAULT_CELL_SIZE}px`);
    assert.equal(element.style.height, `${START_HEIGHT * DEFAULT_CELL_SIZE}px`);
    destroy();
  });

  test('the cellSize option sets the size of one cell', () => {
    const { element, destroy } = makeCheckerboard({ cellSize: 10 });
    assert.equal(element.style.width, '40px');
    assert.equal(element.style.height, '30px');
    destroy();
  });

  test('a new grid size shows with no call to draw()', () => {
    const { element, destroy } = makeCheckerboard({ cellSize: 10 });
    setGridSize(8, 2);
    assert.equal(element.style.width, '80px');
    assert.equal(element.style.height, '20px');
    destroy();
  });
});

describe('checkerboard pattern', () => {
  test('one square is one cell by default', () => {
    // One tile is 2 x 2 squares, so the tile is two cells wide.
    const { element, destroy } = makeCheckerboard({ cellSize: 10 });
    assert.equal(element.style.backgroundSize, '20px 20px');
    destroy();
  });

  test('the squareSize option sets the size of one square, not the size on screen', () => {
    const { element, destroy } = makeCheckerboard({ cellSize: 10, squareSize: 8 });
    assert.equal(element.style.backgroundSize, '16px 16px');
    assert.equal(element.style.width, '40px');
    assert.equal(element.style.height, '30px');
    destroy();
  });

  test('the pattern uses the default colors', () => {
    const { element, destroy } = makeCheckerboard();
    assert.ok(element.style.backgroundImage.includes(DEFAULT_CHECKER_LIGHT));
    assert.ok(element.style.backgroundImage.includes(DEFAULT_CHECKER_DARK));
    destroy();
  });

  test('the lightColor and darkColor options set the colors', () => {
    const { element, destroy } = makeCheckerboard({ lightColor: '#111111', darkColor: '#222222' });
    assert.ok(element.style.backgroundImage.includes('#111111'));
    assert.ok(element.style.backgroundImage.includes('#222222'));
    destroy();
  });
});

describe('destroy', () => {
  test('removes the checkerboard from the container', () => {
    const { destroy } = makeCheckerboard();
    destroy();
    assert.deepEqual(container.children, []);
  });

  test('stops the size changes when the grid changes', () => {
    const { element, destroy } = makeCheckerboard({ cellSize: 10 });
    destroy();
    setGridSize(8, 2);
    assert.equal(element.style.width, '40px');
    assert.equal(element.style.height, '30px');
  });
});
