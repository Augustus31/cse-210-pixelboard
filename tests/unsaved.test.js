import test from 'node:test';
import assert from 'node:assert/strict';
import { isBlankCanvas, snapshotCanvas, hasUnsavedChanges } from '../src/unsaved.js';

const canvasOf = (size, color = '#ffffff') => ({ size, pixels: Array(size * size).fill(color) });
const withOneCell = (canvas, color) => ({ size: canvas.size, pixels: [color, ...canvas.pixels.slice(1)] });

test('isBlankCanvas: all white is blank, any other color is not', () => {
  assert.equal(isBlankCanvas(canvasOf(25).pixels), true);
  assert.equal(isBlankCanvas(withOneCell(canvasOf(25), '#000000').pixels), false);
  assert.equal(isBlankCanvas(['#FFFFFF']), true);
});

test('at page open (no baseline), a blank canvas is not unsaved', () => {
  assert.equal(hasUnsavedChanges(canvasOf(64), null), false);
});

test('at page open (no baseline), a canvas with a drawing is unsaved', () => {
  assert.equal(hasUnsavedChanges(withOneCell(canvasOf(64), '#6d5ce7'), null), true);
});

test('a canvas equal to the baseline is not unsaved', () => {
  const drawing = withOneCell(canvasOf(40), '#6d5ce7');
  assert.equal(hasUnsavedChanges(drawing, snapshotCanvas(drawing)), false);
});

test('a canvas that changed after the baseline is unsaved', () => {
  const baseline = snapshotCanvas(withOneCell(canvasOf(40), '#6d5ce7'));
  assert.equal(hasUnsavedChanges(withOneCell(canvasOf(40), '#000000'), baseline), true);
});

test('a blank canvas is never unsaved, even when it differs from the baseline', () => {
  const baseline = snapshotCanvas(withOneCell(canvasOf(40), '#6d5ce7'));
  assert.equal(hasUnsavedChanges(canvasOf(40), baseline), false);
});

test('a drawing of another size than the baseline is unsaved', () => {
  const baseline = snapshotCanvas(withOneCell(canvasOf(40), '#6d5ce7'));
  assert.equal(hasUnsavedChanges(withOneCell(canvasOf(25), '#6d5ce7'), baseline), true);
});

test('snapshotCanvas keeps a copy, so later drawing does not change the baseline', () => {
  const drawing = withOneCell(canvasOf(25), '#6d5ce7');
  const baseline = snapshotCanvas(drawing);
  drawing.pixels[0] = '#000000';
  assert.equal(baseline.pixels[0], '#6d5ce7');
  assert.equal(hasUnsavedChanges(drawing, baseline), true);
});
