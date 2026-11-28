/**
 * The pencil tool. It writes the central color to each cell of a stroke.
 * The new color replaces the old color of the cell. The two colors are not mixed.
 * @module canvas/tools/pencil
 */
import { setCells } from '../main.js';
import { strokeCells } from '../stroke.js';
import { color } from '../../color/main.js';
import { strokeSize, strokeShape } from './main.js';

/**
 * Pointer down: paints one stamp.
 * @param {{row: number, column: number}} cell - The cell below the pointer
 */
export function onDown(cell) {
  const cells = strokeCells(cell.row, cell.column, cell.row, cell.column, strokeSize, strokeShape);
  setCells(cells, color);
}

/**
 * Pointer move: paints the stroke from the last cell to the current cell.
 * @param {{row: number, column: number}} fromCell - The cell of the last pointer event
 * @param {{row: number, column: number}} toCell - The cell below the pointer now
 */
export function onMove(fromCell, toCell) {
  const cells = strokeCells(
    fromCell.row, fromCell.column, toCell.row, toCell.column, strokeSize, strokeShape,
  );
  setCells(cells, color);
}

/**
 * Pointer up: nothing to do.
 */
export function onUp() {}
