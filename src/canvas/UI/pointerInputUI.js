/**
 * Pointer input for the canvas. It changes pointer events to cells,
 * and sends the cells to the active tool.
 * @module canvas/UI/pointerInputUI
 */
import { screenToCell } from '../screenToCell.js';
import { toolDown, toolMove, toolUp } from '../tools/main.js';

// The main pointer button: the left mouse button, a touch, or a pen tip
const MAIN_BUTTON = 0;

/**
 * Connects pointer events on an element to the active tool.
 * A stroke starts at pointer down, continues with each pointer move, and stops at
 * pointer up or pointer cancel. Only one stroke can be active at a time.
 * @param {HTMLElement|string} target - The element (or a CSS selector) that gets the
 *   pointer events, for example the stage that holds the checkerboard and the canvas
 * @param {Object} options
 * @param {() => {left: number, top: number, width: number, height: number}} options.getCanvasRect -
 *   Gives the position and size of the canvas on screen, for example
 *   () => canvas.element.getBoundingClientRect(). It is called for each pointer event,
 *   so the cells stay correct after a scroll, a zoom, or a new canvas.
 * @param {(cell: {row: number, column: number}) => void} [options.onHover] - Called with
 *   the cell below the pointer for each pointer move. The cell can be outside the grid.
 * @param {() => void} [options.onLeave] - Called when the pointer leaves the element
 * @param {() => void} [options.onStrokeStart] - Called before the tool gets the pointer down
 * @param {() => void} [options.onStrokeEnd] - Called after the tool gets the pointer up
 * @returns {{isStrokeActive: () => boolean, destroy: () => void}}
 *   A function that tells if a stroke is active, and a function that removes the
 *   event listeners. destroy() also stops an active stroke.
 */
export function createPointerInput(target, {
  getCanvasRect, onHover = null, onLeave = null, onStrokeStart = null, onStrokeEnd = null,
}) {
  let targetElement = target;
  if (typeof target === 'string') {
    targetElement = document.querySelector(target);
  }

  // The cell of the last pointer event of the stroke, or null when no stroke is active
  let lastCell = null;

  // The pointer that started the stroke. Other pointers are ignored during the stroke.
  let strokePointerId = null;

  // Finds the cell below the pointer
  function cellFromEvent(event) {
    const rect = getCanvasRect();
    return screenToCell(event.clientX, event.clientY, rect);
  }

  // Pointer down: start a stroke and send it to the active tool
  function onPointerDown(event) {
    if (event.button !== MAIN_BUTTON) return;
    if (lastCell !== null) return;

    // The element keeps the pointer, so the stroke continues outside the element
    targetElement.setPointerCapture(event.pointerId);

    strokePointerId = event.pointerId;
    lastCell = cellFromEvent(event);
    if (onStrokeStart !== null) {
      onStrokeStart();
    }
    toolDown(lastCell);
  }

  // Pointer move: show the cell, and send the move to the active tool when a stroke is active
  function onPointerMove(event) {
    const cell = cellFromEvent(event);
    if (onHover !== null) {
      onHover(cell);
    }

    if (lastCell === null) return;
    if (event.pointerId !== strokePointerId) return;

    // Same cell: the tool has nothing new to paint
    if (cell.row === lastCell.row && cell.column === lastCell.column) return;

    toolMove(lastCell, cell);
    lastCell = cell;
  }

  // Stops the active stroke
  function stopStroke() {
    if (lastCell === null) return;
    lastCell = null;
    strokePointerId = null;
    toolUp();
    if (onStrokeEnd !== null) {
      onStrokeEnd();
    }
  }

  // Pointer up or cancel: stop the stroke of the pointer that started it
  function onPointerUp(event) {
    if (event.pointerId !== strokePointerId) return;
    stopStroke();
  }

  // Pointer leave: tell the caller, for example to hide the hover outline
  function onPointerLeave() {
    if (onLeave !== null) {
      onLeave();
    }
  }

  targetElement.addEventListener('pointerdown', onPointerDown);
  targetElement.addEventListener('pointerleave', onPointerLeave);
  targetElement.addEventListener('pointermove', onPointerMove);
  targetElement.addEventListener('pointerup', onPointerUp);
  targetElement.addEventListener('pointercancel', onPointerUp);

  function isStrokeActive() {
    return lastCell !== null;
  }

  function destroy() {
    stopStroke();
    targetElement.removeEventListener('pointerdown', onPointerDown);
    targetElement.removeEventListener('pointerleave', onPointerLeave);
    targetElement.removeEventListener('pointermove', onPointerMove);
    targetElement.removeEventListener('pointerup', onPointerUp);
    targetElement.removeEventListener('pointercancel', onPointerUp);
  }

  return { isStrokeActive, destroy };
}
