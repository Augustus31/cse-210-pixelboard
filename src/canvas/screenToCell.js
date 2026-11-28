/**
 * Changes a screen position to a cell of the color grid.
 * The function here does no drawing, and it does not read the DOM.
 * @module canvas/screenToCell
 */
import { gridWidth, gridHeight } from './main.js';

/**
 * Finds the grid cell below a screen position.
 * The cell can be outside the grid. Use isInGrid() to check it.
 * @param {number} clientX - The X position in the window, for example event.clientX
 * @param {number} clientY - The Y position in the window, for example event.clientY
 * @param {{left: number, top: number, width: number, height: number}} canvasRect -
 *   The position and size of the canvas on screen, from canvas.getBoundingClientRect()
 * @returns {{row: number, column: number}} The cell, where 0 is the top row and the left column
 */
export function screenToCell(clientX, clientY, canvasRect) {

  // the position from the top left corner of the canvas, in screen pixels
  const localX = clientX - canvasRect.left;
  const localY = clientY - canvasRect.top;

  // the size of one cell on screen
  const cellWidth = canvasRect.width / gridWidth;
  const cellHeight = canvasRect.height / gridHeight;

  const column = Math.floor(localX / cellWidth);
  const row = Math.floor(localY / cellHeight);

  return { row, column };
}
