/**
 * A text box that shows the central color as hex, and changes it when the user types a new hex.
 * @module color/hexInput
 */
import { color, setColor, subscribe } from './main.js';

/**
 * Makes a hex text box inside a given container.
 * @param {HTMLElement|string} container - The element (or a CSS selector) that holds the box
 * @returns {{input: HTMLInputElement, destroy: () => void}}
 *   The text box, and a function that removes it
 */
export function createHexInput(container) {
  let containerElement = container;
  if (typeof container === 'string') {
    containerElement = document.querySelector(container);
  }

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'hex-input';
  input.maxLength = '#rrggbbaa'.length;
  input.spellcheck = false;
  input.autocomplete = 'off';
  input.setAttribute('aria-label', 'Hex color');
  input.value = color;
  containerElement.append(input);


  // Send the typed text to the central color while the user types
  let isSendingTypedText = false;
  function onInputTyping() {
    const typedText = input.value.trim();
    isSendingTypedText = true;
    try {
      setColor(typedText);
    } finally {
      isSendingTypedText = false;
    }
  }
  input.addEventListener('input', onInputTyping);

  // When the user presses Enter or leaves the box, reformat the text to the central color
  function onInputChange() {
    const typedText = input.value.trim();
    setColor(typedText);
    input.value = color;
  }
  input.addEventListener('change', onInputChange);

  // When the central color changes, show it in the box
  function onCentralColorChange(newColor) {
    // dont reformat if the user is still typing
    if (isSendingTypedText) {
      return;
    }
    input.value = newColor;
  }
  const unsubscribe = subscribe(onCentralColorChange);

  function destroy() {
    unsubscribe();
    input.removeEventListener('input', onInputTyping);
    input.removeEventListener('change', onInputChange);
    input.remove();
  }

  return { input, destroy };
}
