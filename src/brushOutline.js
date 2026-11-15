/**
 * The hover outline that shows which cells the brush will change.
 * It is an SVG on top of the canvas. Its viewBox uses cell units, so one unit is one cell.
 * @module brushOutline
 */
import { outlineSegments } from './brush.js';

// The wrapper is a <div> because the `hidden` property does not work on SVG elements in every browser.
const outlineWrapper = document.getElementById('brush-outline');
const outlineSvg = outlineWrapper.querySelector('svg');

/**
 * Draws the outline around the given cells.
 * @param {number[][]} cells - Footprint cells as [x, y]
 * @param {number} canvasSize - Canvas width and height in cells
 */
export function showBrushOutline(cells, canvasSize) {
  const path = outlineSegments(cells).map(([x1, y1, x2, y2]) => `M${x1} ${y1}L${x2} ${y2}`).join('');
  outlineSvg.setAttribute('viewBox', `0 0 ${canvasSize} ${canvasSize}`);
  outlineSvg.querySelectorAll('path').forEach((line) => line.setAttribute('d', path));
  outlineWrapper.hidden = false;
}

/** Hides the outline, for example when the pointer leaves the canvas or a stroke starts. */
export function hideBrushOutline() {
  outlineWrapper.hidden = true;
}
