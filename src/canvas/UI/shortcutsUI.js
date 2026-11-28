/**
 * Keyboard shortcuts for the canvas: the tools, undo, and redo.
 * @module canvas/UI/shortcutsUI
 */
import { setTool } from '../tools/main.js';
import { undo, redo } from '../history.js';

// The tool of each key, in lower case
const TOOL_KEYS = {
  p: 'pencil',
  e: 'eraser',
  i: 'eyedropper',
  f: 'fill',
};

// A key press in one of these elements is text input or a button press, not a shortcut
const IGNORED_TAG_NAMES = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'];

/**
 * Connects the keyboard shortcuts to a target.
 *   P, E, I, F: pencil, eraser, eyedropper, fill
 *   Ctrl+Z or Cmd+Z: undo
 *   Ctrl+Shift+Z, Cmd+Shift+Z, or Ctrl+Y: redo
 * A key press in an input, a text area, a select, or a button is ignored.
 * @param {EventTarget} [target=document] - The element that gets the keydown events
 * @returns {{destroy: () => void}} A function that removes the shortcuts
 */
export function createShortcuts(target = document) {

  // Tells if the key press is in an element that uses the keys itself
  function isInIgnoredElement(event) {
    if (event.target === null || event.target === undefined) return false;
    return IGNORED_TAG_NAMES.includes(event.target.tagName);
  }

  function onKeyDown(event) {
    if (isInIgnoredElement(event)) return;

    const key = event.key.toLowerCase();
    const commandKey = event.ctrlKey || event.metaKey;

    // Undo and redo
    if (commandKey) {
      if (key === 'z' && event.shiftKey == false) {
        event.preventDefault();
        undo();
        return;
      }
      if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        redo();
      }
      return;
    }

    // Alt + a letter is a browser or system shortcut
    if (event.altKey) return;

    // Tools
    const toolName = TOOL_KEYS[key];
    if (toolName === undefined) return;
    setTool(toolName);
  }

  target.addEventListener('keydown', onKeyDown);

  function destroy() {
    target.removeEventListener('keydown', onKeyDown);
  }

  return { destroy };
}
