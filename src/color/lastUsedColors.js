/**
 * A horizontal line of the last used colors. A click on a color makes it the central color.
 * @module color/lastUsedColors
 */
import { color, setColor } from './main.js';

/**
 * Makes a line of last used colors inside a given container.
 * The line starts empty. Call `remember()` each time the user draws with the central color.
 * The newest color is at the left. A color that is in the line already moves to the left,
 * so it does not show twice. The oldest color is removed when the line is full.
 * @param {HTMLElement|string} container - The element (or a CSS selector) that holds the line
 * @param {Object} [options]
 * @param {number} [options.max=8] - The largest number of colors in the line
 * @returns {{element: HTMLElement, remember: () => void, destroy: () => void}}
 *   The line, a function that adds the current central color, and a function that removes the line
 */
export function createLastUsedColors(container, { max = 8 } = {}) {
  let containerElement = container;
  if (typeof container === 'string') {
    containerElement = document.querySelector(container);
  }

  const element = document.createElement('div');
  element.className = 'last-used-colors';
  element.setAttribute('role', 'group');
  element.setAttribute('aria-label', 'Last used colors');
  containerElement.append(element);

  // The last used colors, '#rrggbbaa', newest first
  let lastUsedColors = [];

  // Makes one color button. A click makes its color the central color.
  function createColorButton(hex) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'last-used-color';
    button.style.setProperty('--color', hex);
    button.title = hex;
    button.setAttribute('aria-label', 'Use color ' + hex);

    function onClick() {
      setColor(hex);
    }
    button.addEventListener('click', onClick);

    return button;
  }

  // Shows the list in the line, newest at the left
  function show() {
    const buttons = [];
    for (const hex of lastUsedColors) {
      buttons.push(createColorButton(hex));
    }
    element.replaceChildren(...buttons);
  }

  // Puts the current central color at the front of the list
  function remember() {
    const newList = [color];
    for (const hex of lastUsedColors) {
      if (newList.length >= max) {
        break;
      }
      if (hex !== color) {
        newList.push(hex);
      }
    }
    lastUsedColors = newList;
    show();
  }

  function destroy() {
    element.remove();
  }

  return { element, remember, destroy };
}
