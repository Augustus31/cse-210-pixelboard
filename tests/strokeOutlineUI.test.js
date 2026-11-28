import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setGridSize } from '../src/canvas/main.js';
import { setTool, setStrokeSize, setStrokeShape } from '../src/canvas/tools/main.js';
import { outlinePath, createStrokeOutline } from '../src/canvas/UI/strokeOutlineUI.js';

/** A stand-in for a DOM element. Node has no DOM, so the tests use this. */
class FakeElement {
  constructor() {
    this.children = [];
    this.attributes = {};
    this.style = {};
    this.parent = null;
    this.hidden = false;
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
    createElementNS: () => new FakeElement(),
    querySelector: (selector) => {
      if (selector === '#stage') return container;
      return null;
    },
  };
});

after(() => {
  delete globalThis.document;
});

/** Each test starts with an 8 x 6 grid, the pencil, and a size 1 square stroke. */
function makeOutline(options) {
  setGridSize(8, 6);
  setTool('pencil');
  setStrokeSize(1);
  setStrokeShape('square');
  container.children = [];
  return createStrokeOutline('#stage', options);
}

/** The path data of the dark line of the outline. */
function shownPath(element) {
  const svg = element.children[0];
  const darkLine = svg.children[1];
  return darkLine.attributes.d;
}

describe('outlinePath', () => {
  test('no cells gives an empty path', () => {
    assert.equal(outlinePath([]), '');
  });

  test('one cell gives its four sides', () => {
    const path = outlinePath([{ row: 2, column: 3 }]);
    assert.equal(path, 'M3 2L4 2M3 3L4 3M3 2L3 3M4 2L4 3');
  });

  test('the side between two cells is not in the path', () => {
    const path = outlinePath([{ row: 0, column: 0 }, { row: 0, column: 1 }]);
    const lineCount = path.split('M').length - 1;
    assert.equal(lineCount, 6);
    assert.equal(path.includes('M1 0L1 1'), false);
  });

  test('a 3 x 3 square gives only the 12 outer sides', () => {
    const cells = [];
    for (let row = 0; row < 3; row++) {
      for (let column = 0; column < 3; column++) {
        cells.push({ row, column });
      }
    }
    const lineCount = outlinePath(cells).split('M').length - 1;
    assert.equal(lineCount, 12);
  });
});

describe('createStrokeOutline', () => {
  test('the outline is in the container, hidden, and ignores the pointer', () => {
    const { element, destroy } = makeOutline();
    assert.deepEqual(container.children, [element]);
    assert.equal(element.hidden, true);
    assert.equal(element.style.pointerEvents, 'none');
    assert.equal(element.style.gridArea, '1 / 1');
    destroy();
  });

  test('the size on screen is the grid size times the cell size', () => {
    const { element, destroy } = makeOutline({ cellSize: 10 });
    assert.equal(element.style.width, '80px');
    assert.equal(element.style.height, '60px');
    assert.equal(element.children[0].attributes.viewBox, '0 0 8 6');
    destroy();
  });

  test('show draws the outline of the cell below the pointer', () => {
    const { element, show, destroy } = makeOutline();
    show({ row: 2, column: 3 });
    assert.equal(element.hidden, false);
    assert.equal(shownPath(element), outlinePath([{ row: 2, column: 3 }]));
    destroy();
  });

  test('the pencil outline has the stroke size', () => {
    const { element, show, destroy } = makeOutline();
    setStrokeSize(3);
    show({ row: 2, column: 3 });
    const lineCount = shownPath(element).split('M').length - 1;
    assert.equal(lineCount, 12);
    destroy();
  });

  test('a change of the stroke size draws the outline again', () => {
    const { element, show, destroy } = makeOutline();
    show({ row: 2, column: 3 });
    const pathBefore = shownPath(element);
    setStrokeSize(3);
    assert.notEqual(shownPath(element), pathBefore);
    destroy();
  });

  test('the fill tool and the eyedropper show one cell for all stroke sizes', () => {
    const { element, show, destroy } = makeOutline();
    setStrokeSize(5);
    setTool('fill');
    show({ row: 2, column: 3 });
    assert.equal(shownPath(element), outlinePath([{ row: 2, column: 3 }]));
    setTool('eyedropper');
    assert.equal(shownPath(element), outlinePath([{ row: 2, column: 3 }]));
    destroy();
  });

  test('a cell outside the grid hides the outline', () => {
    const { element, show, destroy } = makeOutline();
    show({ row: 2, column: 3 });
    show({ row: -1, column: 3 });
    assert.equal(element.hidden, true);
    destroy();
  });

  test('hide hides the outline, and a tool change does not show it again', () => {
    const { element, show, hide, destroy } = makeOutline();
    show({ row: 2, column: 3 });
    hide();
    assert.equal(element.hidden, true);
    setTool('eraser');
    assert.equal(element.hidden, true);
    destroy();
  });

  test('destroy removes the outline and stops the updates', () => {
    const { element, show, destroy } = makeOutline();
    show({ row: 2, column: 3 });
    const pathBefore = shownPath(element);
    destroy();
    assert.deepEqual(container.children, []);
    setStrokeSize(4);
    assert.equal(shownPath(element), pathBefore);
  });
});
