/**
 * The eyedropper tool. It reads the color of one cell and makes it the central color.
 * It does not change the grid.
 * @module canvas/tools/eyedropper
 */
import { getCell } from '../main.js';
import { setColor } from '../../color/main.js';

// Reads the color of a cell and makes it the central color
function pickColor(cell) {
  const cellColor = getCell(cell.row, cell.column);

  // The cell is not in the grid: keep the central color
  if (cellColor === null) return;

  setColor(cellColor);
}

/**
 * Pointer down: reads the color of the cell.
 * An empty cell gives the transparent color.
 * @param {{row: number, column: number}} cell - The cell below the pointer
 */
export function onDown(cell) {
  pickColor(cell);
}

/**
 * Pointer move: reads the color of the cell below the pointer now.
 * @param {{row: number, column: number}} fromCell - The cell of the last pointer event
 * @param {{row: number, column: number}} toCell - The cell below the pointer now
 */
export function onMove(fromCell, toCell) {
  pickColor(toCell);
}

/**
 * Pointer up: nothing to do.
 */
export function onUp() {}
