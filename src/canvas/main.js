/**
 * homescript for the canvas module. Holds the color grid and the grid size.
 * The grid is the image. The screen only shows it.
 * @module canvas/main
 */

// The color of a cell with no paint, '#rrggbbaa' with alpha 00
export const EMPTY_CELL = '#00000000';

// The default size of one cell on screen, in pixels
export const DEFAULT_CELL_SIZE = 16;

const DEFAULT_GRID_SIZE = 32;
export let gridWidth = DEFAULT_GRID_SIZE;
export let gridHeight = DEFAULT_GRID_SIZE;
export let grid = makeEmptyGrid(gridWidth, gridHeight);

//functions to call when the grid changes
const subscribers = new Set();

/**
 * Calls `listener` each time the grid changes (a cell color or the grid size).
 * @param {(grid: string[][]) => void} listener - Gets the grid after the change
 * @returns {() => void} Call this function to stop the calls
 */
export function subscribe(listener) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

/**
 * Makes a grid where all cells are empty.
 * @param {number} width - The number of columns
 * @param {number} height - The number of rows
 * @returns {string[][]} The new grid, as a list of rows
 */
function makeEmptyGrid(width, height) {
  const rows = [];
  for (let row = 0; row < height; row++) {
    const cells = [];
    for (let column = 0; column < width; column++) {
      cells.push(EMPTY_CELL);
    }
    rows.push(cells);
  }
  return rows;
}

/**
 * Tells if a cell position is in the grid.
 * @param {number} row - The row of the cell, 0 is the top row
 * @param {number} column - The column of the cell, 0 is the left column
 * @returns {boolean} true when the cell is in the grid
 */
export function isInGrid(row, column) {
  if (Number.isInteger(row) == false) return false;
  if (Number.isInteger(column) == false) return false;
  if (row < 0) return false;
  if (row >= gridHeight) return false;
  if (column < 0) return false;
  if (column >= gridWidth) return false;
  return true;
}

/**
 * Reads the color of one cell.
 * @param {number} row - The row of the cell, 0 is the top row
 * @param {number} column - The column of the cell, 0 is the left column
 * @returns {string|null} The color, '#rrggbbaa', or null when the cell is not in the grid
 */
export function getCell(row, column) {
  if (isInGrid(row, column) == false) return null;
  return grid[row][column];
}

/**
 * Changes the color of one cell.
 * A cell that is not in the grid is ignored.
 * @param {number} row - The row of the cell, 0 is the top row
 * @param {number} column - The column of the cell, 0 is the left column
 * @param {string} cellColor - The new color, '#rrggbbaa' in lower case
 * @returns {boolean} true when the cell is in the grid (also when the color is the same
 *   as the current color), false when it is not
 */
export function setCell(row, column, cellColor) {
  if (isInGrid(row, column) == false) return false;

  // Same color: do not call the subscribers. This also stops a loop.
  if (grid[row][column] === cellColor) return true;

  // call all the subscriber functions if the cell changes
  grid[row][column] = cellColor;
  for (const listener of subscribers) listener(grid);
  return true;
}

/**
 * Changes the grid size. All cells become empty.
 * A size that is not a whole number above 0 is ignored, and the grid stays the same.
 * @param {number} width - The new number of columns
 * @param {number} height - The new number of rows
 * @returns {boolean} true when the size is valid, false when it is not
 */
export function setGridSize(width, height) {
  if (Number.isInteger(width) == false) return false;
  if (Number.isInteger(height) == false) return false;
  if (width < 1) return false;
  if (height < 1) return false;

  gridWidth = width;
  gridHeight = height;
  grid = makeEmptyGrid(gridWidth, gridHeight);

  // calls subscribers with the new grid
  for (const listener of subscribers) listener(grid);
  return true;
}
