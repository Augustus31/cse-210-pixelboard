/**
 * @file Color format conversions and blending.
 * @module color
 */

/**
 * Converts HSV to RGB. Each RGB channel is rounded to a whole number.
 * @param {{h: number, s: number, v: number}} hsv
 * @returns {{r: number, g: number, b: number}}
 */
export function hsvToRgb({ h, s, v }) {
  const sector = (((h % 360) + 360) % 360) / 60;
  const value = v / 100;
  const chroma = value * (s / 100);
  const second = chroma * (1 - Math.abs((sector % 2) - 1));
  const [red, green, blue] = [
    [chroma, second, 0], [second, chroma, 0], [0, chroma, second],
    [0, second, chroma], [second, 0, chroma], [chroma, 0, second],
  ][Math.floor(sector)];
  const lightest = value - chroma;
  const toChannel = (part) => Math.round((part + lightest) * 255);
  return { r: toChannel(red), g: toChannel(green), b: toChannel(blue) };
}

/**
 * Converts RGB to HSV. The result is not rounded, so RGB -> HSV -> RGB gives back the same color.
 * @param {{r: number, g: number, b: number}} rgb
 * @param {number} [fallbackHue=0] - Hue to keep when the color has no visible hue (gray, white, black).
 *   The picker passes its last hue here, so the ring marker does not jump.
 * @returns {{h: number, s: number, v: number}}
 */
export function rgbToHsv({ r, g, b }, fallbackHue = 0) {
  const largest = Math.max(r, g, b);
  const smallest = Math.min(r, g, b);
  const range = largest - smallest;
  const v = (largest / 255) * 100;
  if (range === 0) return { h: fallbackHue, s: 0, v };
  let sector;
  if (largest === r) sector = ((((g - b) / range) % 6) + 6) % 6;
  else if (largest === g) sector = (b - r) / range + 2;
  else sector = (r - g) / range + 4;
  return { h: sector * 60, s: (range / largest) * 100, v };
}

/**
 * Changes one channel of a color and returns the new HSV.
 * For an RGB channel, the other two RGB channels stay the same.
 * @param {{h: number, s: number, v: number}} hsv - The current color
 * @param {'h'|'s'|'v'|'r'|'g'|'b'} channel - The channel to change
 * @param {number} value - The new channel value
 * @returns {{h: number, s: number, v: number}}
 */
export function withChannel(hsv, channel, value) {
  if (channel in hsv) return { ...hsv, [channel]: value };
  // Spread hsv first, so extra fields such as alpha (a) stay the same.
  return { ...hsv, ...rgbToHsv({ ...hsvToRgb(hsv), [channel]: value }, hsv.h) };
}

/**
 * Mixes a new color over an old color, like a thin layer of watercolor.
 * Each channel: round(alpha × new + (1 − alpha) × old). The result is opaque.
 * @param {string} newHex - The color being painted, '#rrggbb'
 * @param {string} oldHex - The color already in the cell, '#rrggbb'
 * @param {number} alpha - 0 (keep the old color) to 1 (use the new color)
 * @returns {string} The mixed color, '#rrggbb'
 */
export function blendHex(newHex, oldHex, alpha) {
  const top = hexToRgb(newHex);
  const bottom = hexToRgb(oldHex);
  const mix = (channel) => Math.round(alpha * top[channel] + (1 - alpha) * bottom[channel]);
  return rgbToHex({ r: mix('r'), g: mix('g'), b: mix('b') });
}

/**
 * Formats RGB as lowercase '#rrggbb'.
 * @param {{r: number, g: number, b: number}} rgb
 * @returns {string}
 */
export function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Reads '#rrggbb', 'rrggbb', or the short '#rgb' form. Spaces around the text are ignored.
 * @param {string} text
 * @returns {{r: number, g: number, b: number}|null} null when the text is not a hex color
 */
export function hexToRgb(text) {
  if (typeof text !== 'string') return null;
  let digits = text.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(digits)) digits = [...digits].map((digit) => digit + digit).join('');
  if (!/^[0-9a-f]{6}$/i.test(digits)) return null;
  const channel = (start) => parseInt(digits.slice(start, start + 2), 16);
  return { r: channel(0), g: channel(2), b: channel(4) };
}
