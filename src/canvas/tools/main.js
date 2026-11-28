/**
 * homescript for the canvas tools. Holds the tool state: the active tool,
 * and the stroke size and shape that the pencil and the eraser share.
 * @module canvas/tools/main
 */
import { STROKE_SHAPES } from '../stroke.js';
import * as pencil from './pencil.js';
import * as eraser from './eraser.js';
import * as eyedropper from './eyedropper.js';
import * as fill from './fill.js';

// Each tool has the same three functions: onDown(cell), onMove(fromCell, toCell), onUp()
const TOOLS = { pencil, eraser, eyedropper, fill };

// The names of the tools
export const TOOL_NAMES = ['pencil', 'eraser', 'eyedropper', 'fill'];

// The name of the active tool
export let tool = 'pencil';

// The stroke size in cells and the stroke shape, for the pencil and the eraser
export let strokeSize = 1;
export let strokeShape = 'square';

//functions to call when the tool state changes
const subscribers = new Set();

/**
 * Calls `listener` each time the tool, the stroke size, or the stroke shape changes.
 * @param {(state: {tool: string, strokeSize: number, strokeShape: string}) => void} listener -
 *   Gets the tool state after the change
 * @returns {() => void} Call this function to stop the calls
 */
export function subscribe(listener) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

// Calls all the subscriber functions with the current tool state
function callSubscribers() {
  const state = { tool, strokeSize, strokeShape };
  for (const listener of subscribers) listener(state);
}

/**
 * Changes the active tool.
 * A name that is not in TOOL_NAMES is ignored, and the tool stays the same.
 * @param {string} name - The new tool: 'pencil', 'eraser', 'eyedropper', or 'fill'
 * @returns {boolean} true when the name is valid, false when it is not
 */
export function setTool(name) {
  if (TOOL_NAMES.includes(name) == false) return false;

  // Same tool: do not call the subscribers
  if (name === tool) return true;

  tool = name;
  callSubscribers();
  return true;
}

/**
 * Changes the stroke size of the pencil and the eraser.
 * A size that is not a whole number above 0 is ignored, and the size stays the same.
 * @param {number} size - The new width and height of the stroke, in cells
 * @returns {boolean} true when the size is valid, false when it is not
 */
export function setStrokeSize(size) {
  if (Number.isInteger(size) == false) return false;
  if (size < 1) return false;

  // Same size: do not call the subscribers
  if (size === strokeSize) return true;

  strokeSize = size;
  callSubscribers();
  return true;
}

/**
 * Changes the stroke shape of the pencil and the eraser.
 * A shape that is not in STROKE_SHAPES is ignored, and the shape stays the same.
 * @param {string} shape - The new shape: 'square' or 'round'
 * @returns {boolean} true when the shape is valid, false when it is not
 */
export function setStrokeShape(shape) {
  if (STROKE_SHAPES.includes(shape) == false) return false;

  // Same shape: do not call the subscribers
  if (shape === strokeShape) return true;

  strokeShape = shape;
  callSubscribers();
  return true;
}

/**
 * Sends a pointer down to the active tool.
 * @param {{row: number, column: number}} cell - The cell below the pointer
 */
export function toolDown(cell) {
  TOOLS[tool].onDown(cell);
}

/**
 * Sends a pointer move to the active tool. Call it only while the button is down.
 * @param {{row: number, column: number}} fromCell - The cell of the last pointer event
 * @param {{row: number, column: number}} toCell - The cell below the pointer now
 */
export function toolMove(fromCell, toCell) {
  TOOLS[tool].onMove(fromCell, toCell);
}

/**
 * Sends a pointer up to the active tool.
 */
export function toolUp() {
  TOOLS[tool].onUp();
}
