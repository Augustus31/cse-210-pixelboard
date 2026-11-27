/**
 * UI displaying of the color grid
 * @module canvas/UI/canvasUI
 */
import {
  grid, gridWidth, gridHeight, subscribe, EMPTY_CELL, DEFAULT_CELL_SIZE,
} from '../main.js';

/**
 * Makes a canvas that shows the color grid inside a given container.
 
 * The container must have `display: grid`. The checkerboard and the canvas
 * both go in grid area 1 / 1, so the canvas is exactly above the checkerboard.
 * Make the checkerboard first, then the canvas.
 * @param {HTMLElement|string} container - The element (or a CSS selector) that holds it
 * @param {Object} [options]
 * @param {number} [options.cellSize=DEFAULT_CELL_SIZE] - The width and height of one
 *   grid cell on screen, in pixels. Use the same value as the checkerboard.
 * @returns {{element: HTMLCanvasElement, draw: () => void, destroy: () => void}}
 *   The canvas, a function that draws the grid again, and a function that removes the canvas.
 *   The canvas calls draw() each time the grid changes.
 */
export function createCanvas(container, { cellSize = DEFAULT_CELL_SIZE } = {}) {
  let containerElement = container;
  if (typeof container === 'string') {
    containerElement = document.querySelector(container);
  }

  const element = document.createElement('canvas');
  element.className = 'canvas-grid';
  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', 'Pixel art canvas');

  // Same grid area as the checkerboard, so the two are in the same position
  element.style.gridArea = '1 / 1';

  // No smoothing when CSS makes the canvas larger
  element.style.imageRendering = 'pixelated';

  const context = element.getContext('2d');

  // Draws the full color grid
  function draw() {

    // One canvas pixel for each cell. A change of width or height also clears the canvas!!
    if (element.width !== gridWidth) {
      element.width = gridWidth;
    }
    if (element.height !== gridHeight) {
      element.height = gridHeight;
    }

    // The size on screen
    const screenWidth = gridWidth * cellSize;
    const screenHeight = gridHeight * cellSize;
    element.style.width = `${screenWidth}px`;
    element.style.height = `${screenHeight}px`;

    // Remove the old drawing
    context.clearRect(0, 0, gridWidth, gridHeight);

    // Paint each cell that is not empty as a 1 x 1 square
    for (let row = 0; row < gridHeight; row++) {
      for (let column = 0; column < gridWidth; column++) {
        const cellColor = grid[row][column];
        if (cellColor === EMPTY_CELL) continue;
        context.fillStyle = cellColor;
        context.fillRect(column, row, 1, 1);
      }
    }
  }

  draw();
  containerElement.append(element);

  // draw the grid again each time the grid changes
  const unsubscribe = subscribe(draw);

  function destroy() {
    unsubscribe();
    element.remove();
  }

  return { element, draw, destroy };
}
