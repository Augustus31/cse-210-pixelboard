/**
 * The fill tool. It writes the central color to the connected area of cells
 * that have the same color as the cell below the pointer.
 * @module canvas/tools/fill
 */
import { setCells } from '../main.js';
import { floodCells } from '../floodFill.js';
import { color } from '../../color/main.js';

/**
 * Pointer down: fills the area.
 * @param {{row: number, column: number}} cell - The cell below the pointer
 */
export function onDown(cell) {
  const cells = floodCells(cell.row, cell.column);
  setCells(cells, color);
}

/**
 * Pointer move: nothing to do. A fill occurs only on pointer down.
 */
export function onMove() {}

/**
 * Pointer up: nothing to do.
 */
export function onUp() {}
