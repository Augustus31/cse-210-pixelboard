/**
 * A horizontal row of color buttons (a palette). A click on a button sets the central color.
 * @module color/swatch
 */
import { setColor } from './main.js';

// The colors that show when the caller gives no colors
export const DEFAULT_SWATCH_COLORS = [
  '#000000',
  '#ffffff',
  '#808080',
  '#ff0000',
  '#ff8800',
  '#ffff00',
  '#00ff00',
  '#00ffff',
  '#0000ff',
  '#ff00ff',
];

/**
 * Makes a horizontal row of color buttons inside a given container.
 * @param {HTMLElement|string} container - The element (or a CSS selector) that holds the row
 * @param {Object} [options]
 * @param {string[]} [options.colors=DEFAULT_SWATCH_COLORS] - The colors to show,
 *   '#rrggbb' or '#rrggbbaa'
 * @param {number} [options.size=24] - The width and height of one button, in pixels
 * @returns {{element: HTMLElement, buttons: HTMLButtonElement[], destroy: () => void}}
 *   The row, its buttons, and a function that removes the row
 */
export function createSwatch(container, { colors = DEFAULT_SWATCH_COLORS, size = 24 } = {}) {
  let containerElement = container;
  if (typeof container === 'string') {
    containerElement = document.querySelector(container);
  }

  // The row. Flex with the row direction puts the buttons side by side.
  const element = document.createElement('div');
  element.className = 'swatch-row';
  element.setAttribute('role', 'group');
  element.setAttribute('aria-label', 'Color swatches');
  element.style.display = 'flex';
  element.style.flexDirection = 'row';
  element.style.flexWrap = 'wrap';
  element.style.gap = '4px';

  // One button for each color
  const buttons = [];
  const clickHandlers = [];
  for (const swatchColor of colors) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'swatch-color';
    button.title = swatchColor;
    button.setAttribute('aria-label', `Use color ${swatchColor}`);
    button.style.width = `${size}px`;
    button.style.height = `${size}px`;
    button.style.padding = '0';
    button.style.border = '1px solid #1e1e1e';
    button.style.cursor = 'pointer';
    button.style.backgroundColor = swatchColor;

    function onClick() {
      setColor(swatchColor);
    }
    button.addEventListener('click', onClick);

    buttons.push(button);
    clickHandlers.push(onClick);
    element.append(button);
  }

  containerElement.append(element);

  function destroy() {
    for (let index = 0; index < buttons.length; index += 1) {
      buttons[index].removeEventListener('click', clickHandlers[index]);
    }
    element.remove();
  }

  return { element, buttons, destroy };
}
