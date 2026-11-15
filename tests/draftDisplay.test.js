import test from 'node:test';
import assert from 'node:assert/strict';
import { pixelsToRgba, formatSavedAt, nextDraftSelection } from '../src/draftDisplay.js';

test('pixelsToRgba turns each #rrggbb cell into 4 opaque RGBA bytes', () => {
  assert.deepEqual([...pixelsToRgba(['#ff0000', '#00ff80'])], [255, 0, 0, 255, 0, 255, 128, 255]);
});

test('pixelsToRgba gives a Uint8ClampedArray, as ImageData needs', () => {
  assert.ok(pixelsToRgba(['#ffffff']) instanceof Uint8ClampedArray);
});

test('formatSavedAt gives a short date and time', () => {
  assert.match(formatSavedAt('2026-11-15T10:30:00.000Z', 'UTC'), /^Nov 15, 10:30\sAM$/u);
  assert.match(formatSavedAt('2026-01-02T23:05:00.000Z', 'UTC'), /^Jan 2, 11:05\sPM$/u);
});

test('first click on a draft only highlights it', () => {
  assert.deepEqual(nextDraftSelection(null, 'a'), { selectedId: 'a', askToLoad: false });
});

test('clicking another draft moves the highlight', () => {
  assert.deepEqual(nextDraftSelection('a', 'b'), { selectedId: 'b', askToLoad: false });
});

test('clicking the highlighted draft asks to load it', () => {
  assert.deepEqual(nextDraftSelection('a', 'a'), { selectedId: 'a', askToLoad: true });
});
