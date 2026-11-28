/**
 * Three buttons: Undo, Redo, and Erase all.
 * @module canvas/UI/historyButtonsUI
 */
import { clearGrid } from '../main.js';
import {
  beginStep, endStep, undo, redo, canUndo, canRedo, subscribe,
} from '../history.js';

/**
 * Makes all cells empty, as one undo step.
 * @returns {boolean} true when a cell changed, false when the grid was empty already
 */
export function eraseAll() {
  beginStep();
  clearGrid();
  return endStep();
}

/**
 * Makes the Undo, Redo, and Erase all buttons inside a given container.
 * The Undo and Redo buttons are disabled when there is no step to undo or redo.
 * @param {HTMLElement|string} container - The element (or a CSS selector) that holds the buttons
 * @returns {{element: HTMLElement, destroy: () => void}}
 *   The group of buttons, and a function that removes the group
 */
export function createHistoryButtons(container) {
  let containerElement = container;
  if (typeof container === 'string') {
    containerElement = document.querySelector(container);
  }

  const element = document.createElement('div');
  element.className = 'canvas-history-buttons';
  element.setAttribute('role', 'group');
  element.setAttribute('aria-label', 'History');

  // Makes one button that calls `action` on a click
  function createButton(text, title, action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'canvas-history-button';
    button.textContent = text;
    button.title = title;

    function onClick() {
      action();
    }
    button.addEventListener('click', onClick);

    element.append(button);
    return button;
  }

  const undoButton = createButton('Undo', 'Undo (Ctrl+Z)', undo);
  const redoButton = createButton('Redo', 'Redo (Ctrl+Shift+Z)', redo);
  createButton('Erase all', 'Erase every cell of the canvas (undoable)', eraseAll);

  // Disables the buttons that can do nothing
  function show(state) {
    undoButton.disabled = state.canUndo == false;
    redoButton.disabled = state.canRedo == false;
  }

  show({ canUndo: canUndo(), canRedo: canRedo() });
  containerElement.append(element);

  // show the buttons again each time the history changes
  const unsubscribe = subscribe(show);

  function destroy() {
    unsubscribe();
    element.remove();
  }

  return { element, destroy };
}
