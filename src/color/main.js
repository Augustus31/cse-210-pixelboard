/**
 * homescript for the color module, moving all exports to a single file for easier imports.
 * @module color/main
 */

/** The central color of the app, '#rrggbb'. Importers always see the current value. */
export let color = '#6d5ce7';


const HEX_COLOR_REGEX = /^#[0-9a-f]{6}$/i;

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

  color = hex.toLowerCase();
  return true;
}

export { createColorPicker } from './colorPicker.js';
export { blendHex } from './color.js';
export { loadSectionState, saveSectionState } from './colorSections.js';
export { createRecentColorsRow } from './recentColorsRow.js';
