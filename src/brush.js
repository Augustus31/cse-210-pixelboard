/**
 * Brush footprint math for the pencil and the eraser.
 * Every function here is pure: it returns cell coordinates and never touches the DOM.
 * @module brush
 */

const MIN_BRUSH_SIZE = 1;

/**
 * Returns the cells that one brush stamp changes.
 * For even sizes the block cannot center on one cell, so the pointer cell is
 * the top-left cell of the 2 x 2 center (the block grows to the right and down).
 * @param {number} x - Column of the pointer cell
 * @param {number} y - Row of the pointer cell
 * @param {number} size - Brush width and height in cells, >= 1
 * @param {'square'|'round'} shape - Brush shape
 * @returns {number[][]} List of [x, y] cells, which can be outside the canvas
 */
export function brushCells(x, y, size, shape) {
  const left = x - Math.floor((size - 1) / 2);
  const top = y - Math.floor((size - 1) / 2);
  const cells = [];
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      if (shape === 'square' || isInsideRoundBrush(column, row, size)) cells.push([left + column, top + row]);
    }
  }
  return cells;
}

// The radius is a little smaller than half the size. With exactly size / 2, the
// corner cells of a size 3 brush are still inside the circle, so round would look square.
function isInsideRoundBrush(column, row, size) {
  const radius = size / 2 - 0.25;
  const distanceX = column + 0.5 - size / 2;
  const distanceY = row + 0.5 - size / 2;
  return distanceX * distanceX + distanceY * distanceY <= radius * radius;
}

/**
 * Removes the cells that fall outside a square canvas.
 * @param {number[][]} cells - List of [x, y] cells
 * @param {number} canvasSize - Canvas width and height in cells
 * @returns {number[][]} Only the cells inside the canvas
 */
export function cellsInsideCanvas(cells, canvasSize) {
  return cells.filter(([x, y]) => x >= 0 && x < canvasSize && y >= 0 && y < canvasSize);
}

/**
 * Largest brush size for a canvas. A quarter of the canvas keeps a big brush useful but not overwhelming.
 * @param {number} canvasSize - Canvas width and height in cells
 * @returns {number} Maximum brush size, at least 1
 */
export function maxBrushSize(canvasSize) {
  return Math.max(MIN_BRUSH_SIZE, Math.floor(canvasSize / 4));
}

/**
 * Turns user input into a valid brush size.
 * @param {number|string} value - The value the user typed or dragged
 * @param {number} canvasSize - Canvas width and height in cells
 * @param {number} lastValidSize - Size to keep when the value is not a number
 * @returns {number} A whole number from 1 to maxBrushSize(canvasSize)
 */
export function clampBrushSize(value, canvasSize, lastValidSize) {
  const number = typeof value === 'string' && value.trim() === '' ? NaN : Number(value);
  if (!Number.isFinite(number)) return lastValidSize;
  return Math.min(maxBrushSize(canvasSize), Math.max(MIN_BRUSH_SIZE, Math.round(number)));
}

/**
 * Finds the outer edges of a group of cells, so the page can draw an outline around the footprint.
 * An edge is outer when the cell on the other side is not in the group.
 * @param {number[][]} cells - List of [x, y] cells
 * @returns {number[][]} List of [x1, y1, x2, y2] line segments in cell units
 */
export function outlineSegments(cells) {
  const cellKeys = new Set(cells.map(([x, y]) => `${x},${y}`));
  const hasCell = (x, y) => cellKeys.has(`${x},${y}`);
  const segments = [];
  for (const [x, y] of cells) {
    if (!hasCell(x, y - 1)) segments.push([x, y, x + 1, y]);
    if (!hasCell(x, y + 1)) segments.push([x, y + 1, x + 1, y + 1]);
    if (!hasCell(x - 1, y)) segments.push([x, y, x, y + 1]);
    if (!hasCell(x + 1, y)) segments.push([x + 1, y, x + 1, y + 1]);
  }
  return segments;
}
