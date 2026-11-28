/**
 * Undo and redo for the color grid.
 * One step is one user action, for example one stroke, one fill, or one erase all.
 * Each step keeps only the cells that the action changed, with the color of each
 * cell before and after the action.
 * @module canvas/history
 */
import { grid, gridWidth, gridHeight, copyGrid, setGrid } from './main.js';

// The largest number of steps to keep. The oldest step is removed when the list is full.
export const MAX_STEPS = 200;

// The steps. The last item of each list is the newest one.
// A step has one of two forms:
//   { changes: [{row, column, before, after}] } - the cells that changed color
//   { beforeGrid, afterGrid } - two full grids, only for a change of the grid size
let undoStack = [];
let redoStack = [];

// The copy of the grid from beginStep(), or null when no step is open
let openStepGrid = null;

//functions to call when undo or redo becomes possible or not possible
const subscribers = new Set();

/**
 * Calls `listener` each time the history changes.
 * Use this to enable and disable the undo and redo buttons.
 * @param {(state: {canUndo: boolean, canRedo: boolean}) => void} listener -
 *   Gets the history state after the change
 * @returns {() => void} Call this function to stop the calls
 */
export function subscribe(listener) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

// Calls all the subscriber functions with the current history state
function callSubscribers() {
  const state = { canUndo: canUndo(), canRedo: canRedo() };
  for (const listener of subscribers) listener(state);
}

/**
 * Makes a step from the grid before an action and the grid now.
 * @param {string[][]} beforeGrid - The copy of the grid from before the action
 * @returns {Object|null} The step, or null when the action did not change the grid
 */
function makeStep(beforeGrid) {
  const sameHeight = beforeGrid.length === gridHeight;
  const sameWidth = beforeGrid[0].length === gridWidth;

  // A different size: the cells cannot be compared one by one, so keep the two full grids
  if (sameHeight == false || sameWidth == false) {
    return { beforeGrid, afterGrid: copyGrid() };
  }

  const changes = [];
  for (let row = 0; row < gridHeight; row++) {
    for (let column = 0; column < gridWidth; column++) {
      const before = beforeGrid[row][column];
      const after = grid[row][column];
      if (before === after) continue;
      changes.push({ row, column, before, after });
    }
  }

  if (changes.length === 0) return null;
  return { changes };
}

/**
 * Changes the grid to the state before a step or after a step.
 * The grid subscribers are called one time.
 * @param {Object} step - The step, from makeStep()
 * @param {boolean} toBefore - true for the state before the step (undo),
 *   false for the state after the step (redo)
 */
function applyStep(step, toBefore) {

  // A step with two full grids
  if (step.changes === undefined) {
    if (toBefore) {
      setGrid(step.beforeGrid);
    } else {
      setGrid(step.afterGrid);
    }
    return;
  }

  // A step with changed cells: change the cells in a copy, then replace the grid one time
  const newGrid = copyGrid();
  for (const change of step.changes) {
    if (toBefore) {
      newGrid[change.row][change.column] = change.before;
    } else {
      newGrid[change.row][change.column] = change.after;
    }
  }
  setGrid(newGrid);
}

/**
 * Tells if undo() can change the grid.
 * @returns {boolean} true when there is a step to undo
 */
export function canUndo() {
  return undoStack.length > 0;
}

/**
 * Tells if redo() can change the grid.
 * @returns {boolean} true when there is a step to redo
 */
export function canRedo() {
  return redoStack.length > 0;
}

/**
 * Starts a step. Call this before the action changes the grid.
 * A second call before endStep() is ignored, so the step keeps the first copy.
 */
export function beginStep() {
  if (openStepGrid !== null) return;
  openStepGrid = copyGrid();
}

/**
 * Completes a step. Call this after the action.
 * The step is kept only when the action changed the grid. A new step removes all redo steps.
 * @returns {boolean} true when the step is kept, false when the grid did not change
 *   or no step was open
 */
export function endStep() {
  if (openStepGrid === null) return false;

  const beforeGrid = openStepGrid;
  openStepGrid = null;

  // No change, for example a stroke of the eyedropper
  const step = makeStep(beforeGrid);
  if (step === null) return false;

  undoStack.push(step);
  if (undoStack.length > MAX_STEPS) {
    undoStack.shift();
  }
  redoStack = [];
  callSubscribers();
  return true;
}

/**
 * Puts the grid back to the state before the newest step.
 * It does nothing while a step is open.
 * @returns {boolean} true when the grid changed, false when there is no step to undo
 */
export function undo() {
  if (openStepGrid !== null) return false;
  if (undoStack.length === 0) return false;

  const step = undoStack.pop();
  redoStack.push(step);
  applyStep(step, true);
  callSubscribers();
  return true;
}

/**
 * Does the newest undone step again.
 * It does nothing while a step is open.
 * @returns {boolean} true when the grid changed, false when there is no step to redo
 */
export function redo() {
  if (openStepGrid !== null) return false;
  if (redoStack.length === 0) return false;

  const step = redoStack.pop();
  undoStack.push(step);
  applyStep(step, false);
  callSubscribers();
  return true;
}

/**
 * Removes all undo and redo steps, and closes an open step.
 * Use this when a new image starts, for example after a change of the grid size.
 */
export function clearHistory() {
  const hadSteps = canUndo() || canRedo();
  undoStack = [];
  redoStack = [];
  openStepGrid = null;

  // No change: do not call the subscribers
  if (hadSteps == false) return;
  callSubscribers();
}
