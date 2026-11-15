import test from 'node:test';
import assert from 'node:assert/strict';
import { hsvToRgb, rgbToHsv, rgbToHex, hexToRgb, withChannel } from '../src/color.js';

test('hsvToRgb converts the primary colors', () => {
  assert.deepEqual(hsvToRgb({ h: 0, s: 100, v: 100 }), { r: 255, g: 0, b: 0 });
  assert.deepEqual(hsvToRgb({ h: 120, s: 100, v: 100 }), { r: 0, g: 255, b: 0 });
  assert.deepEqual(hsvToRgb({ h: 240, s: 100, v: 100 }), { r: 0, g: 0, b: 255 });
  assert.deepEqual(hsvToRgb({ h: 60, s: 100, v: 100 }), { r: 255, g: 255, b: 0 });
});

test('hsvToRgb gives white at S 0 and black at V 0, for any hue', () => {
  assert.deepEqual(hsvToRgb({ h: 200, s: 0, v: 100 }), { r: 255, g: 255, b: 255 });
  assert.deepEqual(hsvToRgb({ h: 200, s: 80, v: 0 }), { r: 0, g: 0, b: 0 });
});

test('hsvToRgb treats hue 360 the same as hue 0', () => {
  assert.deepEqual(hsvToRgb({ h: 360, s: 100, v: 100 }), hsvToRgb({ h: 0, s: 100, v: 100 }));
});

test('rgbToHsv converts the primary colors', () => {
  assert.deepEqual(rgbToHsv({ r: 255, g: 0, b: 0 }), { h: 0, s: 100, v: 100 });
  assert.deepEqual(rgbToHsv({ r: 0, g: 255, b: 0 }), { h: 120, s: 100, v: 100 });
  assert.deepEqual(rgbToHsv({ r: 0, g: 0, b: 255 }), { h: 240, s: 100, v: 100 });
});

test('rgbToHsv keeps the given hue for grays, white, and black', () => {
  assert.equal(rgbToHsv({ r: 128, g: 128, b: 128 }, 210).h, 210);
  assert.equal(rgbToHsv({ r: 255, g: 255, b: 255 }, 33).h, 33);
  assert.equal(rgbToHsv({ r: 0, g: 0, b: 0 }, 300).h, 300);
  assert.equal(rgbToHsv({ r: 0, g: 0, b: 0 }).h, 0);
});

test('RGB -> HSV -> RGB gives back the same color', () => {
  for (const hex of ['#6d5ce7', '#292a35', '#ffffff', '#000000', '#a84651', '#3d6c58', '#f3c660', '#010203']) {
    const rgb = hexToRgb(hex);
    assert.deepEqual(hsvToRgb(rgbToHsv(rgb)), rgb, hex);
  }
});

test('HSV -> RGB -> HSV gives back nearly the same values (RGB rounds to whole numbers)', () => {
  for (const hsv of [{ h: 10, s: 80, v: 90 }, { h: 135, s: 55, v: 60 }, { h: 250, s: 60, v: 91 }, { h: 330, s: 95, v: 40 }]) {
    const result = rgbToHsv(hsvToRgb(hsv));
    assert.ok(Math.abs(result.h - hsv.h) < 1.5, `h ${result.h} vs ${hsv.h}`);
    assert.ok(Math.abs(result.s - hsv.s) < 1, `s ${result.s} vs ${hsv.s}`);
    assert.ok(Math.abs(result.v - hsv.v) < 1, `v ${result.v} vs ${hsv.v}`);
  }
});

test('rgbToHex formats lowercase #rrggbb with leading zeros', () => {
  assert.equal(rgbToHex({ r: 109, g: 92, b: 231 }), '#6d5ce7');
  assert.equal(rgbToHex({ r: 1, g: 2, b: 3 }), '#010203');
});

test('hexToRgb reads #rrggbb, rrggbb, and the short #rgb form', () => {
  assert.deepEqual(hexToRgb('#6D5CE7'), { r: 109, g: 92, b: 231 });
  assert.deepEqual(hexToRgb('6d5ce7'), { r: 109, g: 92, b: 231 });
  assert.deepEqual(hexToRgb(' #fa0 '), { r: 255, g: 170, b: 0 });
});

test('hexToRgb returns null for text that is not a hex color', () => {
  for (const text of ['', '#12345', '#1234567', 'red', '#ggg000', null]) assert.equal(hexToRgb(text), null, String(text));
});

test('withChannel changes one HSV channel and keeps the others', () => {
  assert.deepEqual(withChannel({ h: 10, s: 20, v: 30 }, 'h', 200), { h: 200, s: 20, v: 30 });
  assert.deepEqual(withChannel({ h: 10, s: 20, v: 30 }, 'v', 90), { h: 10, s: 20, v: 90 });
});

test('withChannel changes one RGB channel and keeps the other two RGB channels', () => {
  const start = rgbToHsv({ r: 100, g: 150, b: 200 });
  assert.deepEqual(hsvToRgb(withChannel(start, 'r', 250)), { r: 250, g: 150, b: 200 });
  assert.deepEqual(hsvToRgb(withChannel(start, 'b', 0)), { r: 100, g: 150, b: 0 });
});

test('withChannel keeps the hue when an RGB change makes the color gray', () => {
  const start = rgbToHsv({ r: 100, g: 100, b: 200 });
  assert.equal(start.h, 240);
  const gray = withChannel(start, 'b', 100);
  assert.equal(gray.s, 0);
  assert.equal(gray.h, 240);
});
