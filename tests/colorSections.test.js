import test from 'node:test';
import assert from 'node:assert/strict';
import { SECTION_STORAGE_KEY, DEFAULT_SECTION_STATE, loadSectionState, saveSectionState } from '../src/color/colorSections.js';

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value); },
    data,
  };
}

test('defaults: color wheel open, advanced and swatches closed', () => {
  assert.deepEqual(DEFAULT_SECTION_STATE, { wheel: true, advanced: false, swatches: false });
});

test('loadSectionState gives the defaults when nothing is saved', () => {
  assert.deepEqual(loadSectionState(fakeStorage()), DEFAULT_SECTION_STATE);
});

test('loadSectionState gives the defaults when storage is not available', () => {
  assert.deepEqual(loadSectionState(null), DEFAULT_SECTION_STATE);
  const throwingStorage = { getItem() { throw new Error('blocked'); } };
  assert.deepEqual(loadSectionState(throwingStorage), DEFAULT_SECTION_STATE);
});

test('loadSectionState ignores bad JSON and values that are not true or false', () => {
  assert.deepEqual(loadSectionState(fakeStorage({ [SECTION_STORAGE_KEY]: '{oops' })), DEFAULT_SECTION_STATE);
  const saved = JSON.stringify({ wheel: 'yes', swatches: true, extra: true });
  assert.deepEqual(loadSectionState(fakeStorage({ [SECTION_STORAGE_KEY]: saved })), { wheel: true, advanced: false, swatches: true });
});

test('saveSectionState then loadSectionState gives back the same state', () => {
  const storage = fakeStorage();
  const state = { wheel: false, advanced: true, swatches: true };
  assert.equal(saveSectionState(storage, state), true);
  assert.deepEqual(loadSectionState(storage), state);
});

test('saveSectionState returns false when storage fails', () => {
  assert.equal(saveSectionState(null, DEFAULT_SECTION_STATE), false);
  assert.equal(saveSectionState({ setItem() { throw new Error('full'); } }, DEFAULT_SECTION_STATE), false);
});
