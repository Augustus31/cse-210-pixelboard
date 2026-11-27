import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { color, setColor } from '../src/color/main.js';
import { createLastUsedColors } from '../src/color/UI/lastUsedColorsUI.js';

// `color` is shared module state, so each test starts from a known color.
const START = '#123456ff';

/** A stand-in for a DOM element. Node has no DOM, so the tests use this. */
class FakeElement extends EventTarget {
  constructor() {
    super();
    this.children = [];
    this.attributes = {};
    this.parent = null;
    this.properties = {};
    this.style = {
      setProperty: (name, value) => {
        this.properties[name] = value;
      },
    };
  }

  append(child) {
    this.children.push(child);
    child.parent = this;
  }

  replaceChildren(...newChildren) {
    this.children = newChildren;
    for (const child of newChildren) {
      child.parent = this;
    }
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
      if (selector === '#last-used') return container;
      return null;
    },
  };
});

after(() => {
  delete globalThis.document;
});

function makeLastUsedColors(options) {
  setColor(START);
  container.children = [];
  return createLastUsedColors('#last-used', options);
}

/** Acts like the user drawing with the color `hex`. */
function userDrawsWith(lastUsedColors, hex) {
  setColor(hex);
  lastUsedColors.remember();
}

/** The colors in the line, from left to right. */
function shownColors(element) {
  const colors = [];
  for (const button of element.children) {
    colors.push(button.properties['--color']);
  }
  return colors;
}

describe('createLastUsedColors setup', () => {
  test('the line is put in the container from a CSS selector', () => {
    const { element, destroy } = makeLastUsedColors();
    assert.deepEqual(container.children, [element]);
    destroy();
  });

  test('the line is put in a given element', () => {
    setColor(START);
    const givenElement = new FakeElement();
    const { element, destroy } = createLastUsedColors(givenElement);
    assert.deepEqual(givenElement.children, [element]);
    destroy();
  });

  test('the line starts empty', () => {
    const { element, destroy } = makeLastUsedColors();
    assert.deepEqual(shownColors(element), []);
    destroy();
  });
});

describe('remember', () => {
  test('remember adds the central color to the line', () => {
    const lastUsedColors = makeLastUsedColors();
    lastUsedColors.remember();
    assert.deepEqual(shownColors(lastUsedColors.element), [START]);
    lastUsedColors.destroy();
  });

  test('the newest color is at the left', () => {
    const lastUsedColors = makeLastUsedColors();
    userDrawsWith(lastUsedColors, '#ff0000ff');
    userDrawsWith(lastUsedColors, '#00ff00ff');
    userDrawsWith(lastUsedColors, '#0000ffff');
    assert.deepEqual(shownColors(lastUsedColors.element), ['#0000ffff', '#00ff00ff', '#ff0000ff']);
    lastUsedColors.destroy();
  });

  test('a color that is in the line already moves to the left', () => {
    const lastUsedColors = makeLastUsedColors();
    userDrawsWith(lastUsedColors, '#ff0000ff');
    userDrawsWith(lastUsedColors, '#00ff00ff');
    userDrawsWith(lastUsedColors, '#ff0000ff');
    assert.deepEqual(shownColors(lastUsedColors.element), ['#ff0000ff', '#00ff00ff']);
    lastUsedColors.destroy();
  });

  test('the same color with a different alpha is a different color', () => {
    const lastUsedColors = makeLastUsedColors();
    userDrawsWith(lastUsedColors, '#ff0000ff');
    userDrawsWith(lastUsedColors, '#ff000080');
    assert.deepEqual(shownColors(lastUsedColors.element), ['#ff000080', '#ff0000ff']);
    lastUsedColors.destroy();
  });

  test('the oldest color is removed when the line is full', () => {
    const lastUsedColors = makeLastUsedColors({ max: 3 });
    userDrawsWith(lastUsedColors, '#000001ff');
    userDrawsWith(lastUsedColors, '#000002ff');
    userDrawsWith(lastUsedColors, '#000003ff');
    userDrawsWith(lastUsedColors, '#000004ff');
    assert.deepEqual(shownColors(lastUsedColors.element), ['#000004ff', '#000003ff', '#000002ff']);
    lastUsedColors.destroy();
  });

  test('the line holds 8 colors by default', () => {
    const lastUsedColors = makeLastUsedColors();
    for (let number = 0; number < 10; number = number + 1) {
      userDrawsWith(lastUsedColors, '#00000' + number + 'ff');
    }
    assert.equal(lastUsedColors.element.children.length, 8);
    lastUsedColors.destroy();
  });

  test('a central color change does not change the line', () => {
    const lastUsedColors = makeLastUsedColors();
    lastUsedColors.remember();
    setColor('#00ff00ff');
    assert.deepEqual(shownColors(lastUsedColors.element), [START]);
    lastUsedColors.destroy();
  });
});

describe('click on a color', () => {
  test('a click makes that color the central color', () => {
    const lastUsedColors = makeLastUsedColors();
    userDrawsWith(lastUsedColors, '#ff000080');
    userDrawsWith(lastUsedColors, '#00ff00ff');
    const oldestButton = lastUsedColors.element.children[1];
    oldestButton.dispatchEvent(new Event('click'));
    assert.equal(color, '#ff000080');
    lastUsedColors.destroy();
  });

  test('a click does not change the order of the line', () => {
    const lastUsedColors = makeLastUsedColors();
    userDrawsWith(lastUsedColors, '#ff0000ff');
    userDrawsWith(lastUsedColors, '#00ff00ff');
    lastUsedColors.element.children[1].dispatchEvent(new Event('click'));
    assert.deepEqual(shownColors(lastUsedColors.element), ['#00ff00ff', '#ff0000ff']);
    lastUsedColors.destroy();
  });
});

describe('destroy', () => {
  test('destroy removes the line from the container', () => {
    const { destroy } = makeLastUsedColors();
    destroy();
    assert.deepEqual(container.children, []);
  });
});
