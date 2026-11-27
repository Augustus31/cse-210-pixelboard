/**
 * The checkerboard that is below the canvas. It shows where the cells are empty.
 * It is only a background. It holds no pixel data, and it is not in the saved image.
 * @module canvas/UI/checkerboardUI
 */
import { gridWidth, gridHeight, subscribe, DEFAULT_CELL_SIZE } from '../main.js';

// The two colors of the checkerboard squares
export const DEFAULT_CHECKER_LIGHT = '#ffffff';
export const DEFAULT_CHECKER_DARK = '#dddddd';

/**
 * Makes a checkerboard inside a given container.
 * The checkerboard has the same size on screen as the canvas.
 *
 * The container must have `display: grid`. The checkerboard and the canvas
 * both go in grid area 1 / 1, so the canvas is exactly above the checkerboard.
 * Make the checkerboard first, then the canvas.
 * @param {HTMLElement|string} container - The element (or a CSS selector) that holds it
 * @param {Object} [options]
 * @param {number} [options.cellSize=DEFAULT_CELL_SIZE] - The width and height of one
 *   grid cell on screen, in pixels. Use the same value as the canvas.
 * @param {number} [options.squareSize=cellSize] - The width and height of one
 *   checkerboard square, in pixels. The default makes one square for each cell.
 * @param {string} [options.lightColor=DEFAULT_CHECKER_LIGHT] - The color of the light squares
 * @param {string} [options.darkColor=DEFAULT_CHECKER_DARK] - The color of the dark squares
 * @returns {{element: HTMLElement, draw: () => void, destroy: () => void}}
 *   The checkerboard, a function that draws it again, and a function that removes it.
 *   The checkerboard calls draw() each time the grid changes, so the caller usually does not.
 */
export function createCheckerboard(container, {
  cellSize = DEFAULT_CELL_SIZE,
  squareSize = cellSize,
  lightColor = DEFAULT_CHECKER_LIGHT,
  darkColor = DEFAULT_CHECKER_DARK,
} = {}) {
  let containerElement = container;
  if (typeof container === 'string') {
    containerElement = document.querySelector(container);
  }

  const element = document.createElement('div');
  element.className = 'canvas-checkerboard';
  element.setAttribute('aria-hidden', 'true');

  // puts this element in the same grid area as the canvas, so the two are in the same position
  element.style.gridArea = '1 / 1';

  // the signature checkerboard pattern
  const tileSize = squareSize * 2;
  element.style.backgroundImage =
    `repeating-conic-gradient(${darkColor} 0 25%, ${lightColor} 0 50%)`;
  element.style.backgroundSize = `${tileSize}px ${tileSize}px`;
  element.style.backgroundPosition = '0 0';

  // Sets the size on screen from the current grid size
  function draw() {
    const screenWidth = gridWidth * cellSize;
    const screenHeight = gridHeight * cellSize;
    element.style.width = `${screenWidth}px`;
    element.style.height = `${screenHeight}px`;
  }

  draw();
  containerElement.append(element);

  // set the size again each time the grid changes
  const unsubscribe = subscribe(draw);

  function destroy() {
    unsubscribe();
    element.remove();
  }

  return { element, draw, destroy };
}
