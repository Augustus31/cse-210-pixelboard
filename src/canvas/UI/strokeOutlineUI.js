/**
 * The hover outline. It shows the cells that the active tool will change
 * when the user presses the pointer on the cell below it.
 * @module canvas/UI/strokeOutlineUI
 */
import { gridWidth, gridHeight, isInGrid, subscribe, DEFAULT_CELL_SIZE } from '../main.js';
import { stampCells } from '../stroke.js';
import {
  tool, strokeSize, strokeShape, subscribe as subscribeTools,
} from '../tools/main.js';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

// The tools that paint a stamp of strokeSize. The other tools use one cell.
const STAMP_TOOLS = ['pencil', 'eraser'];

/**
 * Makes the SVG path data for the outline around a group of cells.
 * The path has one line for each cell side that has no cell of the group next to it.
 * One unit in the path is one cell.
 * @param {{row: number, column: number}[]} cells - The cells of the group
 * @returns {string} The path data, for example 'M0 0L1 0M1 0L1 1'. Empty for no cells.
 */
export function outlinePath(cells) {
  const cellKeys = new Set();
  for (const cell of cells) {
    cellKeys.add(`${cell.row},${cell.column}`);
  }

  let path = '';
  for (const cell of cells) {
    const top = cell.row;
    const bottom = cell.row + 1;
    const left = cell.column;
    const right = cell.column + 1;

    // top side
    if (cellKeys.has(`${cell.row - 1},${cell.column}`) == false) {
      path = path + `M${left} ${top}L${right} ${top}`;
    }
    // bottom side
    if (cellKeys.has(`${cell.row + 1},${cell.column}`) == false) {
      path = path + `M${left} ${bottom}L${right} ${bottom}`;
    }
    // left side
    if (cellKeys.has(`${cell.row},${cell.column - 1}`) == false) {
      path = path + `M${left} ${top}L${left} ${bottom}`;
    }
    // right side
    if (cellKeys.has(`${cell.row},${cell.column + 1}`) == false) {
      path = path + `M${right} ${top}L${right} ${bottom}`;
    }
  }
  return path;
}

/**
 * Makes the hover outline inside a given container.
 * The container must have `display: grid`. The outline goes in grid area 1 / 1,
 * the same as the checkerboard and the canvas. Make it after the canvas, so it is on top.
 * The outline ignores pointer events, so it does not block the canvas.
 * @param {HTMLElement|string} container - The element (or a CSS selector) that holds it
 * @param {Object} [options]
 * @param {number} [options.cellSize=DEFAULT_CELL_SIZE] - The width and height of one
 *   grid cell on screen, in pixels. Use the same value as the canvas.
 * @returns {{element: HTMLElement, show: (cell: {row: number, column: number}) => void,
 *   hide: () => void, destroy: () => void}}
 *   The outline, a function that shows it for the cell below the pointer,
 *   a function that hides it, and a function that removes it.
 */
export function createStrokeOutline(container, { cellSize = DEFAULT_CELL_SIZE } = {}) {
  let containerElement = container;
  if (typeof container === 'string') {
    containerElement = document.querySelector(container);
  }

  // The wrapper is a <div>, because `hidden` does not work on SVG elements in all browsers
  const element = document.createElement('div');
  element.className = 'canvas-stroke-outline';
  element.setAttribute('aria-hidden', 'true');
  element.hidden = true;
  element.style.gridArea = '1 / 1';
  element.style.pointerEvents = 'none';

  // A stamp near an edge has cells outside the grid. Those lines are not shown.
  element.style.overflow = 'hidden';

  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  svg.style.display = 'block';
  svg.style.width = '100%';
  svg.style.height = '100%';
  element.append(svg);

  // Makes one line of the outline. The line width stays the same for all cell sizes.
  function createLine(lineColor, lineWidth) {
    const line = document.createElementNS(SVG_NAMESPACE, 'path');
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', lineColor);
    line.setAttribute('stroke-width', String(lineWidth));
    line.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.append(line);
    return line;
  }

  // A wide white line below a thin dark line, so the outline shows on light and dark colors
  const lightLine = createLine('white', 3);
  const darkLine = createLine('#222222', 1);

  // The cell below the pointer, or null when the outline is hidden
  let pointerCell = null;

  // Sets the size on screen from the current grid size, and draws the outline again
  function draw() {
    const screenWidth = gridWidth * cellSize;
    const screenHeight = gridHeight * cellSize;
    element.style.width = `${screenWidth}px`;
    element.style.height = `${screenHeight}px`;

    // One unit is one cell
    svg.setAttribute('viewBox', `0 0 ${gridWidth} ${gridHeight}`);

    if (pointerCell === null) {
      element.hidden = true;
      return;
    }

    let cells = [pointerCell];
    if (STAMP_TOOLS.includes(tool)) {
      cells = stampCells(pointerCell.row, pointerCell.column, strokeSize, strokeShape);
    }

    const path = outlinePath(cells);
    lightLine.setAttribute('d', path);
    darkLine.setAttribute('d', path);
    element.hidden = false;
  }

  // Shows the outline for the cell below the pointer. A cell outside the grid hides it.
  function show(cell) {
    if (isInGrid(cell.row, cell.column) == false) {
      hide();
      return;
    }
    pointerCell = { row: cell.row, column: cell.column };
    draw();
  }

  function hide() {
    pointerCell = null;
    element.hidden = true;
  }

  draw();
  containerElement.append(element);

  // draw again each time the grid, the tool, or the stroke changes
  const unsubscribeGrid = subscribe(draw);
  const unsubscribeTools = subscribeTools(draw);

  function destroy() {
    unsubscribeGrid();
    unsubscribeTools();
    element.remove();
  }

  return { element, show, hide, destroy };
}
