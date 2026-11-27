/**
 * homescript for the color module, moving all exports to a single file for easier imports.
 * @module color/main
 */

// The central color of the app, '#rrggbbaa' in lower case
export let color = '#6d5ce7ff';

const HEX_COLOR_REGEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;

//functions to call when color changes
const subscribers = new Set();

/**
 * Calls `listener` each time the color changes.
 * @param {(color: string) => void} listener - Gets the new color, '#rrggbbaa'
 * @returns {() => void} Call this function to stop the calls
 */
export function subscribe(listener) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

/**
 * Changes the central color.
 * Text that is not a valid '#rrggbb' or '#rrggbbaa' hex is ignored, and the color stays the same.
 * A '#rrggbb' value is stored as '#rrggbbff' (fully opaque).
 * @param {string} hex - The new color, '#rrggbb' or '#rrggbbaa' (upper or lower case)
 * @returns {boolean} true when the color is valid (also when it is the same as the current color),
 *   false when it is not valid
 */
export function setColor(hex) {

  //verify that the hex is a valid color
  if (typeof hex !== 'string') return false; 
  if (HEX_COLOR_REGEX.test(hex) == false) return false;


  // add alpha to hex if its not there, and convert to lower case
  let newColor = hex.toLowerCase();
  const hasAlpha = newColor.length === '#rrggbbaa'.length;
  if (hasAlpha == false) {
    newColor = newColor + 'ff';
  }

  // Same color: do not call the subscribers.
  // This also stops a loop when a subscriber calls setColor.
  if (newColor === color) return true;

  // call all the subscriber functions if color changes
  color = newColor;
  for (const listener of subscribers) listener(color);
  return true;
}

export { createColorPicker } from './colorPicker.js';
export { createColorWheel } from './colorWheel.js';
export { blendHex } from './color.js';
export { loadSectionState, saveSectionState } from './colorSections.js';
export { createRecentColorsRow } from './recentColorsRow.js';
