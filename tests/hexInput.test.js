import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { color, setColor } from '../src/color/main.js';
import { createHexInput } from '../src/color/hexInput.js';

// `color` is shared module state, so each test starts from a known color.
const START = '#123456ff';

/** A stand-in for a DOM element. Node has no DOM, so the tests use this. */
class FakeElement extends EventTarget {
  constructor() {
    super();
    this.children = [];
    this.attributes = {};
    this.parent = null;
    this.value = '';
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
      if (selector === '#hex') return container;
      return null;
    },
  };
});

after(() => {
  delete globalThis.document;
});

function makeHexInput() {
  setColor(START);
  container.children = [];
  return createHexInput('#hex');
}

/** Acts like the user typing `text` and then pressing Enter. */
function userTypes(input, text) {
  input.value = text;
  input.dispatchEvent(new Event('change'));
}

describe('createHexInput setup', () => {
  test('the box is put in the container from a CSS selector', () => {
    const { input, destroy } = makeHexInput();
    assert.deepEqual(container.children, [input]);
    destroy();
  });

  test('the box is put in a given element', () => {
    setColor(START);
    const element = new FakeElement();
    const { input, destroy } = createHexInput(element);
    assert.deepEqual(element.children, [input]);
    destroy();
  });

  test('the box starts with the central color', () => {
    const { input, destroy } = makeHexInput();
    assert.equal(input.value, START);
    destroy();
  });

  test('the box accepts 9 characters at most', () => {
    const { input, destroy } = makeHexInput();
    assert.equal(input.maxLength, 9);
    destroy();
  });
});

describe('typed text to central color', () => {
  test('a #rrggbbaa value changes the central color', () => {
    const { input, destroy } = makeHexInput();
    userTypes(input, '#ff880080');
    assert.equal(color, '#ff880080');
    assert.equal(input.value, '#ff880080');
    destroy();
  });

  test('a #rrggbb value gets full alpha', () => {
    const { input, destroy } = makeHexInput();
    userTypes(input, '#ff8800');
    assert.equal(color, '#ff8800ff');
    assert.equal(input.value, '#ff8800ff');
    destroy();
  });

  test('uppercase text shows in lower case', () => {
    const { input, destroy } = makeHexInput();
    userTypes(input, '#FF8800');
    assert.equal(input.value, '#ff8800ff');
    destroy();
  });

  test('the current color typed as #rrggbb shows in the stored format', () => {
    const { input, destroy } = makeHexInput();
    userTypes(input, '#123456');
    assert.equal(color, START);
    assert.equal(input.value, START);
    destroy();
  });

  test('spaces before and after the text are removed', () => {
    const { input, destroy } = makeHexInput();
    userTypes(input, '  #ff8800  ');
    assert.equal(color, '#ff8800ff');
    destroy();
  });

  test('text that is not valid does not change the central color', () => {
    for (const text of ['banana', '#ff880', '#ff8800f', 'ff8800', '']) {
      const { input, destroy } = makeHexInput();
      userTypes(input, text);
      assert.equal(color, START, `"${text}" should not change the color`);
      destroy();
    }
  });

  test('text that is not valid changes back to the current color', () => {
    const { input, destroy } = makeHexInput();
    userTypes(input, 'banana');
    assert.equal(input.value, START);
    destroy();
  });
});

describe('central color to box', () => {
  test('a new central color shows in the box', () => {
    const { input, destroy } = makeHexInput();
    setColor('#00ff0080');
    assert.equal(input.value, '#00ff0080');
    destroy();
  });

  test('a #rrggbb central color shows with full alpha', () => {
    const { input, destroy } = makeHexInput();
    setColor('#00ff00');
    assert.equal(input.value, '#00ff00ff');
    destroy();
  });
});

describe('destroy', () => {
  test('destroy removes the box from the container', () => {
    const { destroy } = makeHexInput();
    destroy();
    assert.deepEqual(container.children, []);
  });

  test('after destroy, a central color change does not change the box', () => {
    const { input, destroy } = makeHexInput();
    destroy();
    setColor('#00ff00ff');
    assert.equal(input.value, START);
  });

  test('after destroy, typed text does not change the central color', () => {
    const { input, destroy } = makeHexInput();
    destroy();
    userTypes(input, '#ff8800ff');
    assert.equal(color, START);
  });
});
