import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { color, setColor } from '../src/color/main.js';
import { createColorWheel } from '../src/color/colorWheel.js';

// `color` is shared module state, so each test starts from a known color.
const START = '#123456ff';

/** A stand-in for iro.Color. It counts how many times the code sets the color. */
class FakeColor {
  constructor(hex) {
    this.value = hex;
    this.setCount = 0;
  }

  get hex8String() {
    return this.value;
  }

  set hex8String(hex) {
    this.value = hex;
    this.setCount = this.setCount + 1;
  }
}

/** A stand-in for iro.ColorPicker. iro.js needs a browser, so the tests do not use it. */
class FakePicker {
  constructor(container, options) {
    this.container = container;
    this.options = options;
    this.color = new FakeColor(options.color);
    this.listeners = new Map();
    this.removed = false;
    this.el = { remove: () => { this.removed = true; } };
  }

  on(eventName, listener) {
    this.listeners.set(eventName, listener);
  }

  off(eventName, listener) {
    if (this.listeners.get(eventName) === listener) this.listeners.delete(eventName);
  }

  /** Acts like the user moving the wheel or the alpha bar to `hex`. */
  userPicks(hex) {
    this.color.value = hex;
    const listener = this.listeners.get('color:change');
    if (listener) listener(this.color);
  }
}

function makeWheel(options = {}) {
  setColor(START);
  const wheel = createColorWheel('#wheel', { ColorPicker: FakePicker, ...options });
  return { picker: wheel.picker, destroy: wheel.destroy };
}

describe('createColorWheel setup', () => {
  test('the wheel starts with the central color', () => {
    const { picker, destroy } = makeWheel();
    assert.equal(picker.options.color, START);
    destroy();
  });

  test('the wheel is put in the given container', () => {
    const { picker, destroy } = makeWheel();
    assert.equal(picker.container, '#wheel');
    destroy();
  });

  test('the default width is 200', () => {
    const { picker, destroy } = makeWheel();
    assert.equal(picker.options.width, 200);
    destroy();
  });

  test('a given width is used', () => {
    const { picker, destroy } = makeWheel({ width: 150 });
    assert.equal(picker.options.width, 150);
    destroy();
  });

  test('the layout has a wheel and then an alpha bar', () => {
    const { picker, destroy } = makeWheel();
    assert.equal(picker.options.layout.length, 2);
    assert.equal(picker.options.layout[1].options.sliderType, 'alpha');
    destroy();
  });
});

describe('wheel to central color', () => {
  test('a new color on the wheel changes the central color', () => {
    const { picker, destroy } = makeWheel();
    picker.userPicks('#ff8800ff');
    assert.equal(color, '#ff8800ff');
    destroy();
  });

  test('a new value on the alpha bar changes the alpha of the central color', () => {
    const { picker, destroy } = makeWheel();
    picker.userPicks('#12345680');
    assert.equal(color, '#12345680');
    picker.userPicks('#12345600');
    assert.equal(color, '#12345600');
    destroy();
  });
});

describe('central color to wheel', () => {
  test('a new central color shows on the wheel', () => {
    const { picker, destroy } = makeWheel();
    setColor('#00ff0080');
    assert.equal(picker.color.hex8String, '#00ff0080');
    destroy();
  });

  test('a #rrggbb central color shows on the wheel with full alpha', () => {
    const { picker, destroy } = makeWheel();
    setColor('#00ff00');
    assert.equal(picker.color.hex8String, '#00ff00ff');
    destroy();
  });

  test('a color from the wheel is not set on the wheel again', () => {
    const { picker, destroy } = makeWheel();
    picker.userPicks('#80808080');
    assert.equal(picker.color.setCount, 0);
    destroy();
  });

  test('an invalid central color does not change the wheel', () => {
    const { picker, destroy } = makeWheel();
    setColor('banana');
    assert.equal(picker.color.hex8String, START);
    assert.equal(picker.color.setCount, 0);
    destroy();
  });
});

describe('destroy', () => {
  test('destroy removes the wheel from the page', () => {
    const { picker, destroy } = makeWheel();
    destroy();
    assert.equal(picker.removed, true);
  });

  test('after destroy, a central color change does not change the wheel', () => {
    const { picker, destroy } = makeWheel();
    destroy();
    setColor('#00ff00ff');
    assert.equal(picker.color.hex8String, START);
  });

  test('after destroy, the wheel does not change the central color', () => {
    const { picker, destroy } = makeWheel();
    destroy();
    picker.userPicks('#ff8800ff');
    assert.equal(color, START);
  });
});
