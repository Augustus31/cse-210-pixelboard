import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { color, setColor, subscribe } from '../src/color/main.js';

// `color` is shared module state, so each test starts from a known color.
const START = '#123456ff';

function expectRejected(value) {
  setColor(START);
  assert.equal(setColor(value), false, `setColor(${JSON.stringify(value)}) should return false`);
  assert.equal(color, START, `setColor(${JSON.stringify(value)}) should not change the color`);
}

test('color starts as a valid #rrggbbaa value', () => {
  assert.match(color, /^#[0-9a-f]{8}$/);
});


// alpha tests

describe('alpha', () => {
  test('no alpha digits: the color gets full alpha (ff)', () => {
    setColor(START);
    assert.equal(setColor('#ff8800'), true);
    assert.equal(color, '#ff8800ff');
  });

  test('2 alpha digits: full alpha (ff) is kept', () => {
    setColor(START);
    assert.equal(setColor('#ff8800ff'), true);
    assert.equal(color, '#ff8800ff');
  });

  test('2 alpha digits: zero alpha (00) is kept', () => {
    setColor(START);
    assert.equal(setColor('#ff880000'), true);
    assert.equal(color, '#ff880000');
  });

  test('2 alpha digits: values between 00 and ff are kept', () => {
    for (const alpha of ['01', '40', '80', 'c0', 'fe']) {
      setColor(START);
      assert.equal(setColor(`#ff8800${alpha}`), true);
      assert.equal(color, `#ff8800${alpha}`);
    }
  });

  test('uppercase and mixed-case alpha digits change to lowercase', () => {
    setColor(START);
    assert.equal(setColor('#ff8800AB'), true);
    assert.equal(color, '#ff8800ab');
    assert.equal(setColor('#ff8800cD'), true);
    assert.equal(color, '#ff8800cd');
  });

  test('1 alpha digit is rejected', () => {
    for (const value of ['#ff8800f', '#ff88000', '#ff88008']) expectRejected(value);
  });

  test('3 or more alpha digits are rejected', () => {
    for (const value of ['#ff8800fff', '#ff8800ffff', '#ff880080808']) expectRejected(value);
  });

  test('alpha digits that are not hex digits are rejected', () => {
    const values = ['#ff8800gg', '#ff8800fg', '#ff8800 f', '#ff8800-1', '#ff8800.5',
      '#ff8800 ff', '#ff8800ff '];
    for (const value of values) expectRejected(value);
  });

  test('the short forms with alpha (#rgba) are rejected', () => {
    for (const value of ['#f80f', '#F80F', '#0000']) expectRejected(value);
  });

  test('a value with no alpha does not keep the old alpha', () => {
    setColor('#ff880080');
    assert.equal(setColor('#00ff00'), true);
    assert.equal(color, '#00ff00ff');
  });

  test('a change in only the alpha changes the color', () => {
    setColor('#ff8800ff');
    assert.equal(setColor('#ff880040'), true);
    assert.equal(color, '#ff880040');
  });

  test('a change in only the alpha calls the subscriber', () => {
    setColor('#ff8800ff');
    const calls = [];
    const stop = subscribe((newColor) => calls.push(newColor));
    setColor('#ff880040');
    setColor('#ff880000');
    stop();
    assert.deepEqual(calls, ['#ff880040', '#ff880000']);
  });

  test('#rrggbb and #rrggbbff are the same color, so the subscriber is not called', () => {
    setColor('#ff8800ff');
    const calls = [];
    const stop = subscribe((newColor) => calls.push(newColor));
    setColor('#ff8800');
    setColor('#FF8800');
    setColor('#ff8800FF');
    stop();
    assert.deepEqual(calls, []);
  });

  test('#rrggbb after a transparent color calls the subscriber with full alpha', () => {
    setColor('#ff880080');
    const calls = [];
    const stop = subscribe((newColor) => calls.push(newColor));
    setColor('#ff8800');
    stop();
    assert.deepEqual(calls, ['#ff8800ff']);
  });

  test('a rejected alpha value does not call the subscriber', () => {
    setColor(START);
    const calls = [];
    const stop = subscribe((newColor) => calls.push(newColor));
    setColor('#ff8800f');
    setColor('#ff8800fff');
    setColor('#ff8800gg');
    stop();
    assert.deepEqual(calls, []);
  });
});

test('setColor changes uppercase and mixed-case values to lowercase', () => {
  assert.equal(setColor('#FF8800'), true);
  assert.equal(color, '#ff8800ff');
  assert.equal(setColor('#aBcDeF'), true);
  assert.equal(color, '#abcdefff');
  assert.equal(setColor('#FF8800AB'), true);
  assert.equal(color, '#ff8800ab');
});

test('setColor accepts black and white', () => {
  assert.equal(setColor('#000000'), true);
  assert.equal(color, '#000000ff');
  assert.equal(setColor('#ffffff'), true);
  assert.equal(color, '#ffffffff');
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
  const values = ['#f', '#ff', '#fff', '#ffff', '#fffff', '#fffffff', '#fffffffff',
    '#ffffffffff'];
  for (const value of values) expectRejected(value);
});

test('setColor rejects hex values without exactly one leading #', () => {
  for (const value of ['ff8800', '##ff8800', 'ff8800#', '0xff8800', '#ff#880']) {
    expectRejected(value);
  }
});

test('setColor rejects characters that are not hex digits', () => {
  const values = ['#gggggg', '#ff880g', '#ff 880', '#ff-880', '#ff.880', '#ff_880',
    '#ff8800gg'];
  for (const value of values) {
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
    'hsl(32, 100%, 50%)'];
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
    assert.deepEqual(calls, ['#ff0000ff']);
  });

  test('a subscriber gets the lowercase color', () => {
    setColor(START);
    const calls = [];
    const stop = subscribe((newColor) => calls.push(newColor));
    setColor('#FF0000');
    stop();
    assert.deepEqual(calls, ['#ff0000ff']);
  });

  test('the color is already changed when a subscriber is called', () => {
    setColor(START);
    let seen = null;
    const stop = subscribe(() => { seen = color; });
    setColor('#ff0000');
    stop();
    assert.equal(seen, '#ff0000ff');
  });

  test('a subscriber is called one time for each change', () => {
    setColor(START);
    const calls = [];
    const stop = subscribe((newColor) => calls.push(newColor));
    setColor('#ff0000');
    setColor('#00ff00');
    setColor('#0000ff');
    stop();
    assert.deepEqual(calls, ['#ff0000ff', '#00ff00ff', '#0000ffff']);
  });

  test('setting the same color does not call the subscriber', () => {
    setColor(START);
    const calls = [];
    const stop = subscribe((newColor) => calls.push(newColor));
    setColor(START);
    setColor(START.toUpperCase());
    // '#123456' is the same color as '#123456ff'.
    setColor(START.slice(0, 7));
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
    assert.deepEqual(first, ['#ff0000ff']);
    assert.deepEqual(second, ['#ff0000ff']);
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
    assert.deepEqual(second, ['#ff0000ff']);
  });

  test('the same function subscribed two times is called one time', () => {
    setColor(START);
    const calls = [];
    const listener = (newColor) => calls.push(newColor);
    const stop = subscribe(listener);
    subscribe(listener);
    setColor('#ff0000');
    stop();
    assert.deepEqual(calls, ['#ff0000ff']);
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
