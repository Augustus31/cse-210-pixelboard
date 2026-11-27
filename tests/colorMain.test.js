import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { color, setColor, subscribe } from '../src/color/main.js';

// `color` is shared module state, so each test starts from a known color.
const START = '#123456';

function expectRejected(value) {
  setColor(START);
  assert.equal(setColor(value), false, `setColor(${JSON.stringify(value)}) should return false`);
  assert.equal(color, START, `setColor(${JSON.stringify(value)}) should not change the color`);
}

test('color starts as a valid #rrggbb value', () => {
  assert.match(color, /^#[0-9a-f]{6}$/);
});

test('setColor accepts a lowercase #rrggbb value', () => {
  setColor(START);
  assert.equal(setColor('#ff8800'), true);
  assert.equal(color, '#ff8800');
});

test('setColor changes uppercase and mixed-case values to lowercase', () => {
  assert.equal(setColor('#FF8800'), true);
  assert.equal(color, '#ff8800');
  assert.equal(setColor('#aBcDeF'), true);
  assert.equal(color, '#abcdef');
});

test('setColor accepts black and white', () => {
  assert.equal(setColor('#000000'), true);
  assert.equal(color, '#000000');
  assert.equal(setColor('#ffffff'), true);
  assert.equal(color, '#ffffff');
});

test('setColor accepts the same color again', () => {
  setColor(START);
  assert.equal(setColor(START), true);
  assert.equal(color, START);
});

test('setColor rejects empty and whitespace-only strings', () => {
  for (const value of ['', ' ', '\t', '\n', '#']) expectRejected(value);
});

test('setColor rejects the wrong number of digits', () => {
  for (const value of ['#f', '#ff', '#fff', '#ffff', '#fffff', '#fffffff', '#ffffffff']) {
    expectRejected(value);
  }
});

test('setColor rejects hex values without exactly one leading #', () => {
  for (const value of ['ff8800', '##ff8800', 'ff8800#', '0xff8800', '#ff#880']) {
    expectRejected(value);
  }
});

test('setColor rejects characters that are not hex digits', () => {
  for (const value of ['#gggggg', '#ff880g', '#ff 880', '#ff-880', '#ff.880', '#ff_880']) {
    expectRejected(value);
  }
});

test('setColor rejects spaces, tabs, and newlines around a valid value', () => {
  for (const value of [' #ff8800', '#ff8800 ', '\t#ff8800', '#ff8800\n', '\n#ff8800']) {
    expectRejected(value);
  }
});

test('setColor rejects a valid value with more text before or after it', () => {
  for (const value of ['#ff8800;', 'color: #ff8800', '#ff8800 #000000', '#ff8800\n#000000']) {
    expectRejected(value);
  }
});

test('setColor rejects other CSS color formats', () => {
  const values = ['red', 'transparent', 'rgb(255, 136, 0)', 'rgba(255, 136, 0, 1)',
    'hsl(32, 100%, 50%)', '#ff880080'];
  for (const value of values) expectRejected(value);
});

test('setColor rejects look-alike Unicode characters', () => {
  // Full-width digits, a zero-width space, and a full-width number sign.
  for (const value of ['#ff８８００', '#ff8800​', '​#ff8800', '＃ff8800']) {
    expectRejected(value);
  }
});

test('setColor rejects values that are not strings', () => {
  for (const value of [undefined, null, 0, 0xff8800, true, NaN, {}, [], () => '#ff8800']) {
    expectRejected(value);
  }
});

test('setColor rejects objects that turn into a valid hex string', () => {
  // A regex test alone would accept these, because it converts its input to a string first.
  expectRejected(['#ff8800']);
  expectRejected({ toString: () => '#ff8800' });
  expectRejected(new String('#ff8800'));
});

// ---------------------------------------------------------------------------
// subscribe
// ---------------------------------------------------------------------------

describe('subscribe', () => {
  test('a subscriber is called with the new color', () => {
    setColor(START);
    const calls = [];
    const stop = subscribe((newColor) => calls.push(newColor));
    setColor('#ff0000');
    stop();
    assert.deepEqual(calls, ['#ff0000']);
  });

  test('a subscriber gets the lowercase color', () => {
    setColor(START);
    const calls = [];
    const stop = subscribe((newColor) => calls.push(newColor));
    setColor('#FF0000');
    stop();
    assert.deepEqual(calls, ['#ff0000']);
  });

  test('the color is already changed when a subscriber is called', () => {
    setColor(START);
    let seen = null;
    const stop = subscribe(() => { seen = color; });
    setColor('#ff0000');
    stop();
    assert.equal(seen, '#ff0000');
  });

  test('a subscriber is called one time for each change', () => {
    setColor(START);
    const calls = [];
    const stop = subscribe((newColor) => calls.push(newColor));
    setColor('#ff0000');
    setColor('#00ff00');
    setColor('#0000ff');
    stop();
    assert.deepEqual(calls, ['#ff0000', '#00ff00', '#0000ff']);
  });

  test('setting the same color does not call the subscriber', () => {
    setColor(START);
    const calls = [];
    const stop = subscribe((newColor) => calls.push(newColor));
    setColor(START);
    setColor(START.toUpperCase());
    stop();
    assert.deepEqual(calls, []);
  });

  test('an invalid color does not call the subscriber', () => {
    setColor(START);
    const calls = [];
    const stop = subscribe((newColor) => calls.push(newColor));
    setColor('banana');
    setColor(null);
    stop();
    assert.deepEqual(calls, []);
  });

  test('the returned function stops the calls', () => {
    setColor(START);
    const calls = [];
    const stop = subscribe((newColor) => calls.push(newColor));
    stop();
    setColor('#ff0000');
    assert.deepEqual(calls, []);
  });

  test('all subscribers are called', () => {
    setColor(START);
    const first = [];
    const second = [];
    const stopFirst = subscribe((newColor) => first.push(newColor));
    const stopSecond = subscribe((newColor) => second.push(newColor));
    setColor('#ff0000');
    stopFirst();
    stopSecond();
    assert.deepEqual(first, ['#ff0000']);
    assert.deepEqual(second, ['#ff0000']);
  });

  test('stopping one subscriber does not stop the others', () => {
    setColor(START);
    const first = [];
    const second = [];
    const stopFirst = subscribe((newColor) => first.push(newColor));
    const stopSecond = subscribe((newColor) => second.push(newColor));
    stopFirst();
    setColor('#ff0000');
    stopSecond();
    assert.deepEqual(first, []);
    assert.deepEqual(second, ['#ff0000']);
  });

  test('the same function subscribed two times is called one time', () => {
    setColor(START);
    const calls = [];
    const listener = (newColor) => calls.push(newColor);
    const stop = subscribe(listener);
    subscribe(listener);
    setColor('#ff0000');
    stop();
    assert.deepEqual(calls, ['#ff0000']);
  });

  test('a subscriber that sets the same color does not cause a loop', () => {
    setColor(START);
    let count = 0;
    const stop = subscribe((newColor) => {
      count += 1;
      setColor(newColor);
    });
    setColor('#ff0000');
    stop();
    assert.equal(count, 1);
  });
});
