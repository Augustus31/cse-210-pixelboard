/**
 * The "unsaved" rule from Spec 1, section 4.5.6.
 * The baseline is a copy of the canvas at the last successful save or load (null at page open,
 * which means a blank canvas). The canvas is unsaved when it differs from the baseline and is not blank.
 * @module unsaved
 */

/**
 * @typedef {Object} CanvasContent
 * @property {number}   size    Canvas width and height in cells
 * @property {string[]} pixels  One '#rrggbb' color per cell, row by row
 */

/**
 * @param {string[]} pixels
 * @returns {boolean} true when every cell is white
 */
export function isBlankCanvas(pixels) {
  return pixels.every((color) => color.toLowerCase() === '#ffffff');
}

/**
 * Makes a baseline copy, so later drawing does not change it.
 * @param {CanvasContent} canvas
 * @returns {CanvasContent}
 */
export function snapshotCanvas({ size, pixels }) {
  return { size, pixels: pixels.slice() };
}

/**
 * A blank canvas never counts as unsaved, so it never shows the unsaved warning.
 * @param {CanvasContent} canvas - The current canvas
 * @param {CanvasContent|null} baseline - The canvas at the last save or load; null means a blank canvas
 * @returns {boolean}
 */
export function hasUnsavedChanges(canvas, baseline) {
  if (isBlankCanvas(canvas.pixels)) return false;
  if (baseline === null || baseline.size !== canvas.size) return true;
  return canvas.pixels.some((color, index) => color !== baseline.pixels[index]);
}
