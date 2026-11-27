import test from 'node:test';
import assert from 'node:assert/strict';
import { RECENT_COLORS_KEY, MAX_RECENT_COLORS, addRecentColor, loadRecentColors, saveRecentColors } from '../src/recentColors.js';

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value); },
  };
}
const entry = (color, alpha = 100) => ({ color, alpha });

test('the list keeps at most 5 colors', () => {
  assert.equal(MAX_RECENT_COLORS, 5);
});

test('addRecentColor puts the newest color first', () => {
  const list = addRecentColor(addRecentColor([], entry('#111111')), entry('#222222'));
  assert.deepEqual(list, [entry('#222222'), entry('#111111')]);
});

test('adding a color that is already in the list moves it to the front, without a copy', () => {
  const start = [entry('#111111'), entry('#222222'), entry('#333333')];
  assert.deepEqual(addRecentColor(start, entry('#333333')), [entry('#333333'), entry('#111111'), entry('#222222')]);
});

test('the same color with a different alpha is a different item', () => {
  const list = addRecentColor([entry('#111111', 100)], entry('#111111', 50));
  assert.deepEqual(list, [entry('#111111', 50), entry('#111111', 100)]);
});

test('color text is compared without case', () => {
  assert.deepEqual(addRecentColor([entry('#abcdef')], entry('#ABCDEF')), [entry('#abcdef')]);
});

test('when the list has more than 5 items, the oldest item is removed', () => {
  let list = [];
  for (const color of ['#000001', '#000002', '#000003', '#000004', '#000005', '#000006']) list = addRecentColor(list, entry(color));
  assert.deepEqual(list.map((item) => item.color), ['#000006', '#000005', '#000004', '#000003', '#000002']);
});

test('addRecentColor does not change the list it was given', () => {
  const start = [entry('#111111')];
  addRecentColor(start, entry('#222222'));
  assert.deepEqual(start, [entry('#111111')]);
});

test('loadRecentColors gives an empty list when nothing is saved or storage fails', () => {
  assert.deepEqual(loadRecentColors(fakeStorage()), []);
  assert.deepEqual(loadRecentColors(null), []);
  assert.deepEqual(loadRecentColors({ getItem() { throw new Error('blocked'); } }), []);
  assert.deepEqual(loadRecentColors(fakeStorage({ [RECENT_COLORS_KEY]: 'not json' })), []);
});

test('loadRecentColors drops broken items and keeps at most 5', () => {
  const saved = [
    entry('#111111', 40), { color: 'red', alpha: 100 }, { color: '#222222', alpha: 150 }, { color: '#333333' },
    entry('#444444'), entry('#555555'), entry('#666666'), entry('#777777'), entry('#888888'),
  ];
  const list = loadRecentColors(fakeStorage({ [RECENT_COLORS_KEY]: JSON.stringify(saved) }));
  assert.deepEqual(list, [entry('#111111', 40), entry('#444444'), entry('#555555'), entry('#666666'), entry('#777777')]);
});

test('saveRecentColors then loadRecentColors gives back the same list', () => {
  const storage = fakeStorage();
  const list = [entry('#6d5ce7', 50), entry('#ffffff')];
  assert.equal(saveRecentColors(storage, list), true);
  assert.deepEqual(loadRecentColors(storage), list);
});

test('saveRecentColors returns false when storage fails', () => {
  assert.equal(saveRecentColors(null, []), false);
  assert.equal(saveRecentColors({ setItem() { throw new Error('full'); } }, []), false);
});
