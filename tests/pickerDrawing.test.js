import test from 'node:test';
import assert from 'node:assert/strict';
import { RING_THICKNESS, SQUARE_SIDE } from '../src/color/pickerDrawing.js';

test('the saturation/value square is inscribed in the inner circle of the hue ring', () => {
  const innerRadius = 0.5 - RING_THICKNESS;
  const halfDiagonal = (SQUARE_SIDE * Math.SQRT2) / 2;
  assert.ok(Math.abs(halfDiagonal - innerRadius) < 1e-12, `corner distance ${halfDiagonal} vs inner radius ${innerRadius}`);
});
