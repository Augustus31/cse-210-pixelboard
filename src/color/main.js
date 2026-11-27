/**
 * homescript for the color module, moving all exports to a single file for easier imports.
 * @module color/main
 */

/** The central color of the app, '#rrggbb'. Importers always see the current value. */
export let color = '#6d5ce7';


const HEX_COLOR_REGEX = /^#[0-9a-f]{6}$/i;

//functions to call when color changes
const subscribers = new Set();

/**
 * Calls `listener` each time the color changes.
 * @param {(color: string) => void} listener - Gets the new color, '#rrggbb'
 * @returns {() => void} Call this function to stop the calls
 */
export function subscribe(listener) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

/**
 * Changes the central color.
 * Text that is not a valid '#rrggbb' hex is ignored, and the color stays the same.
 * @param {string} hex - The new color, '#rrggbb' (upper or lower case)
 * @returns {boolean} true when the color was changed
 */
export function setColor(hex) {

  //verify that the hex is a valid color
  if (typeof hex !== 'string') return false; 
  if (HEX_COLOR_REGEX.test(hex) == false) return false;


  // call all the subscriber functions if color changes
  const next = hex.toLowerCase();
  if (next === color) return true;
  color = next;
  for (const listener of subscribers) listener(color);
  return true;
}

export { createColorPicker } from './colorPicker.js';
export { blendHex } from './color.js';
export { loadSectionState, saveSectionState } from './colorSections.js';
export { createRecentColorsRow } from './recentColorsRow.js';
