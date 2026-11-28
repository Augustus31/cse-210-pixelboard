/**
 * Flood fill pattern: the cells that a fill tool changes.
 * The function here only gives a list of cells. It does not change the grid or the DOM.
 * @module canvas/floodFill
 */
import { grid, isInGrid } from './main.js';

/**
 * Gives the connected area of cells that have the same color as a start cell.
 * Two cells are connected when they touch on a side (up, down, left, or right).
 * Cells that touch only at a corner are not connected.
 * @param {number} row - The row of the start cell
 * @param {number} column - The column of the start cell
 * @returns {{row: number, column: number}[]} The cells of the area, with the start cell.
 *   The list is empty when the start cell is not in the grid.
 */
export function floodCells(row, column) {
  if (isInGrid(row, column) == false) return [];

  const startColor = grid[row][column];
  const cells = [];

  // the cells that are found, as 'row,column' text
  const foundCells = new Set();
  foundCells.add(`${row},${column}`);

  // the cells whose neighbors are not checked yet
  const cellsToCheck = [{ row, column }];

  while (cellsToCheck.length > 0) {
    const cell = cellsToCheck.pop();
    cells.push(cell);

    const neighbors = [
      { row: cell.row - 1, column: cell.column },
      { row: cell.row + 1, column: cell.column },
      { row: cell.row, column: cell.column - 1 },
      { row: cell.row, column: cell.column + 1 },
    ];

    for (const neighbor of neighbors) {
      if (isInGrid(neighbor.row, neighbor.column) == false) continue;
      if (grid[neighbor.row][neighbor.column] !== startColor) continue;

      const key = `${neighbor.row},${neighbor.column}`;
      if (foundCells.has(key)) continue;

      foundCells.add(key);
      cellsToCheck.push(neighbor);
    }
  }
  return cells;
}
