import test from 'node:test';
import assert from 'node:assert/strict';
import { color, setColor } from '../src/color/main.js';

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
