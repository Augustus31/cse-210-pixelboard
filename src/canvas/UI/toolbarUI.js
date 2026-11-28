/**
 * A row of tool buttons: pencil, eraser, eyedropper, and fill.
 * A click on a button makes that tool the active tool.
 * @module canvas/UI/toolbarUI
 */
import { tool, setTool, subscribe, TOOL_NAMES } from '../tools/main.js';

// The text on each tool button
const TOOL_LABELS = {
  pencil: 'Pencil',
  eraser: 'Eraser',
  eyedropper: 'Eyedropper',
  fill: 'Fill',
};

// The keyboard shortcut of each tool, shown in the tooltip. See shortcutsUI.js.
const TOOL_KEYS = {
  pencil: 'P',
  eraser: 'E',
  eyedropper: 'I',
  fill: 'F',
};

// The start of each icon: a 20 x 20 drawing with lines in the text color of the button
const ICON_START = '<svg class="control-icon" viewBox="0 0 20 20" width="16" height="16" '
  + 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" '
  + 'stroke-linejoin="round" aria-hidden="true">';
const ICON_END = '</svg>';

// The lines of each tool icon
const TOOL_ICON_PATHS = {
  pencil: '<path d="m4 13-1 5 5-1L18 7l-4-4Z"/><path d="m12 5 4 4"/>',
  eraser: '<path d="m4 11 8-8a2 2 0 0 1 3 0l3 3a2 2 0 0 1 0 3l-8 8H7l-4-4a2 2 0 0 1 1-2Z"/>'
    + '<path d="m8 7 7 7M10 17h8"/>',
  eyedropper: '<path d="m12 4 5 5M11 6l-7 7-1 5 5-1 7-7M14 3l3 3"/>',
  fill: '<path d="m9 3 7 7-6 6a2 2 0 0 1-3 0l-4-4a2 2 0 0 1 0-3Z"/>'
    + '<path d="M3 10h12M17 13c1 1.5 1.5 2.5 1.5 3.2a1.5 1.5 0 0 1-3 0c0-.7.5-1.7 1.5-3.2Z"/>',
};

/**
 * Makes a row of tool buttons inside a given container.
 * The button of the active tool is shown as pressed, also when the tool changes
 * from other code, for example from a keyboard shortcut.
 * @param {HTMLElement|string} container - The element (or a CSS selector) that holds the row
 * @returns {{element: HTMLElement, destroy: () => void}}
 *   The row, and a function that removes the row
 */
export function createToolbar(container) {
  let containerElement = container;
  if (typeof container === 'string') {
    containerElement = document.querySelector(container);
  }

  const element = document.createElement('div');
  element.className = 'canvas-toolbar-tools';
  element.setAttribute('role', 'group');
  element.setAttribute('aria-label', 'Drawing tools');

  // The button of each tool, by tool name
  const buttons = {};

  // Makes one tool button. A click makes its tool the active tool.
  function createToolButton(name) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'canvas-tool-button';
    button.title = `${TOOL_LABELS[name]} (${TOOL_KEYS[name]})`;
    button.dataset.tool = name;

    // The icon, then the name of the tool
    const icon = document.createElement('span');
    icon.className = 'canvas-tool-icon';
    icon.innerHTML = ICON_START + TOOL_ICON_PATHS[name] + ICON_END;
    button.append(icon);

    const label = document.createElement('span');
    label.className = 'canvas-tool-label';
    label.textContent = TOOL_LABELS[name];
    button.append(label);

    function onClick() {
      setTool(name);
    }
    button.addEventListener('click', onClick);

    return button;
  }

  for (const name of TOOL_NAMES) {
    const button = createToolButton(name);
    buttons[name] = button;
    element.append(button);
  }

  // Shows the button of the active tool as pressed
  function show(activeTool) {
    for (const name of TOOL_NAMES) {
      const isActive = name === activeTool;
      buttons[name].setAttribute('aria-pressed', String(isActive));
      buttons[name].classList.toggle('active', isActive);
    }
  }

  show(tool);
  containerElement.append(element);

  // show the active tool again each time the tool state changes
  function onToolChange(state) {
    show(state.tool);
  }
  const unsubscribe = subscribe(onToolChange);

  function destroy() {
    unsubscribe();
    element.remove();
  }

  return { element, destroy };
}
