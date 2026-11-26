import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNumberInput } from '../src/color/numberInput.js';

test('a number in range is kept and rounded to a whole number', () => {
  assert.equal(parseNumberInput('120', 0, 360, 5), 120);
  assert.equal(parseNumberInput('12.6', 0, 360, 5), 13);
});

test('a number out of range changes to the nearest valid value', () => {
  assert.equal(parseNumberInput('400', 0, 255, 5), 255);
  assert.equal(parseNumberInput('-3', 0, 255, 5), 0);
});

test('text that is not a number changes back to the last valid value', () => {
  assert.equal(parseNumberInput('abc', 0, 100, 42), 42);
  assert.equal(parseNumberInput('', 0, 100, 42), 42);
  assert.equal(parseNumberInput('  ', 0, 100, 42), 42);
});
