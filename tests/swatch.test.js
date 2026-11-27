import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { color, setColor } from '../src/color/main.js';
import { createSwatch, DEFAULT_SWATCH_COLORS } from '../src/color/UI/swatchUI.js';

// `color` is shared module state, so each test starts from a known color.
const START = '#123456ff';

const TEST_COLORS = ['#ff0000', '#00ff0080', '#0000FF'];

/** A stand-in for a DOM element. Node has no DOM, so the tests use this. */
class FakeElement extends EventTarget {
  constructor() {
    super();
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
      if (selector === '#swatch') return container;
      return null;
    },
  };
});

after(() => {
  delete globalThis.document;
});

function makeSwatch(options) {
  setColor(START);
  container.children = [];
  return createSwatch('#swatch', options);
}

/** Acts like the user clicking `button`. */
function userClicks(button) {
  button.dispatchEvent(new Event('click'));
}

describe('createSwatch setup', () => {
  test('the row is put in the container from a CSS selector', () => {
    const { element, destroy } = makeSwatch({ colors: TEST_COLORS });
    assert.deepEqual(container.children, [element]);
    destroy();
  });

  test('the row is put in a given element', () => {
    setColor(START);
    const holder = new FakeElement();
    const { element, destroy } = createSwatch(holder, { colors: TEST_COLORS });
    assert.deepEqual(holder.children, [element]);
    destroy();
  });

  test('the row has one button for each color, in the same order', () => {
    const { element, buttons, destroy } = makeSwatch({ colors: TEST_COLORS });
    assert.equal(buttons.length, TEST_COLORS.length);
    assert.deepEqual(element.children, buttons);
    for (let index = 0; index < TEST_COLORS.length; index += 1) {
      assert.equal(buttons[index].style.backgroundColor, TEST_COLORS[index]);
    }
    destroy();
  });

  test('the row is horizontal', () => {
    const { element, destroy } = makeSwatch({ colors: TEST_COLORS });
    assert.equal(element.style.display, 'flex');
    assert.equal(element.style.flexDirection, 'row');
    destroy();
  });

  test('the default colors show when no colors are given', () => {
    const { buttons, destroy } = makeSwatch();
    assert.equal(buttons.length, DEFAULT_SWATCH_COLORS.length);
    destroy();
  });

  test('the size option sets the width and height of each button', () => {
    const { buttons, destroy } = makeSwatch({ colors: TEST_COLORS, size: 32 });
    for (const button of buttons) {
      assert.equal(button.style.width, '32px');
      assert.equal(button.style.height, '32px');
    }
    destroy();
  });

  test('an empty color list makes a row with no buttons', () => {
    const { element, buttons, destroy } = makeSwatch({ colors: [] });
    assert.deepEqual(buttons, []);
    assert.deepEqual(element.children, []);
    destroy();
  });
});

describe('click to central color', () => {
  test('a click on a #rrggbb button sets the central color with full alpha', () => {
    const { buttons, destroy } = makeSwatch({ colors: TEST_COLORS });
    userClicks(buttons[0]);
    assert.equal(color, '#ff0000ff');
    destroy();
  });

  test('a click on a #rrggbbaa button keeps the alpha', () => {
    const { buttons, destroy } = makeSwatch({ colors: TEST_COLORS });
    userClicks(buttons[1]);
    assert.equal(color, '#00ff0080');
    destroy();
  });

  test('a click on an uppercase color sets the lower case color', () => {
    const { buttons, destroy } = makeSwatch({ colors: TEST_COLORS });
    userClicks(buttons[2]);
    assert.equal(color, '#0000ffff');
    destroy();
  });

  test('each button sets its own color', () => {
    const { buttons, destroy } = makeSwatch({ colors: TEST_COLORS });
    userClicks(buttons[0]);
    assert.equal(color, '#ff0000ff');
    userClicks(buttons[1]);
    assert.equal(color, '#00ff0080');
    destroy();
  });

  test('a click on a color that is not valid does not change the central color', () => {
    const { buttons, destroy } = makeSwatch({ colors: ['banana'] });
    userClicks(buttons[0]);
    assert.equal(color, START);
    destroy();
  });
});

describe('destroy', () => {
  test('destroy removes the row from the container', () => {
    const { destroy } = makeSwatch({ colors: TEST_COLORS });
    destroy();
    assert.deepEqual(container.children, []);
  });

  test('after destroy, a click does not change the central color', () => {
    const { buttons, destroy } = makeSwatch({ colors: TEST_COLORS });
    destroy();
    userClicks(buttons[0]);
    assert.equal(color, START);
  });
});
