/**
 * The eraser tool. It makes each cell of a stroke empty.
 * It is the same as the pencil, but it writes EMPTY_CELL and not the central color.
 * @module canvas/tools/eraser
 */
import { setCells, EMPTY_CELL } from '../main.js';
import { strokeCells } from '../stroke.js';
import { strokeSize, strokeShape } from './main.js';

/**
 * Pointer down: erases one stamp.
 * @param {{row: number, column: number}} cell - The cell below the pointer
 */
export function onDown(cell) {
  const cells = strokeCells(cell.row, cell.column, cell.row, cell.column, strokeSize, strokeShape);
  setCells(cells, EMPTY_CELL);
}

/**
 * Pointer move: erases the stroke from the last cell to the current cell.
 * @param {{row: number, column: number}} fromCell - The cell of the last pointer event
 * @param {{row: number, column: number}} toCell - The cell below the pointer now
 */
export function onMove(fromCell, toCell) {
  const cells = strokeCells(
    fromCell.row, fromCell.column, toCell.row, toCell.column, strokeSize, strokeShape,
  );
  setCells(cells, EMPTY_CELL);
}

/**
 * Pointer up: nothing to do.
 */
export function onUp() {}
