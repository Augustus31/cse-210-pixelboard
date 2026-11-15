import test from 'node:test';
import assert from 'node:assert/strict';
import { hueFromOffset, offsetFromHue, svFromSquarePoint, squarePointFromSv } from '../src/pickerGeometry.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} vs ${expected}`);

test('hue 0 is at the top of the ring and grows clockwise', () => {
  close(hueFromOffset(0, -10), 0);
  close(hueFromOffset(10, 0), 90);
  close(hueFromOffset(0, 10), 180);
  close(hueFromOffset(-10, 0), 270);
});

test('hueFromOffset always returns a value from 0 up to (not including) 360', () => {
  for (const [dx, dy] of [[-1, -100], [-5, -5], [3, 4], [-0.001, -1]]) {
    const hue = hueFromOffset(dx, dy);
    assert.ok(hue >= 0 && hue < 360, String(hue));
  }
});

test('offsetFromHue is the reverse of hueFromOffset', () => {
  for (const hue of [0, 45, 90, 179, 270, 359]) {
    const [dx, dy] = offsetFromHue(hue, 50);
    close(Math.hypot(dx, dy), 50);
    close(hueFromOffset(dx, dy), hue);
  }
});

test('svFromSquarePoint: left to right is S, bottom to top is V', () => {
  assert.deepEqual(svFromSquarePoint(0, 100, 100), { s: 0, v: 0 });
  assert.deepEqual(svFromSquarePoint(100, 0, 100), { s: 100, v: 100 });
  assert.deepEqual(svFromSquarePoint(25, 75, 100), { s: 25, v: 25 });
});

test('svFromSquarePoint clamps points outside the square', () => {
  assert.deepEqual(svFromSquarePoint(-20, -20, 100), { s: 0, v: 100 });
  assert.deepEqual(svFromSquarePoint(150, 150, 100), { s: 100, v: 0 });
});

test('squarePointFromSv is the reverse of svFromSquarePoint', () => {
  assert.deepEqual(squarePointFromSv(25, 75, 200), [50, 50]);
  assert.deepEqual(svFromSquarePoint(...squarePointFromSv(40, 60, 200), 200), { s: 40, v: 60 });
});
