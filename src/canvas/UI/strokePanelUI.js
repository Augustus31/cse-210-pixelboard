/**
 * The stroke controls of the pencil and the eraser: a size slider, a size number input,
 * and two shape buttons.
 * @module canvas/UI/strokePanelUI
 */
import {
  strokeSize, strokeShape, setStrokeSize, setStrokeShape, subscribe,
} from '../tools/main.js';
import { STROKE_SHAPES } from '../stroke.js';

// The text on each shape button
const SHAPE_LABELS = {
  square: 'Square',
  round: 'Round',
};

// The smallest stroke size, in cells
const MIN_SIZE = 1;

/**
 * Makes the stroke controls inside a given container.
 * The controls show the stroke state, also when it changes from other code.
 * @param {HTMLElement|string} container - The element (or a CSS selector) that holds the controls
 * @param {Object} [options]
 * @param {number} [options.maxSize=16] - The largest stroke size that the input accepts, in cells
 * @returns {{element: HTMLElement, destroy: () => void}}
 *   The controls, and a function that removes the controls
 */
export function createStrokePanel(container, { maxSize = 16 } = {}) {
  let containerElement = container;
  if (typeof container === 'string') {
    containerElement = document.querySelector(container);
  }

  const element = document.createElement('div');
  element.className = 'canvas-stroke-panel';
  element.setAttribute('role', 'group');
  element.setAttribute('aria-label', 'Stroke settings');

  // --- size slider ---

  const sizeSlider = document.createElement('input');
  sizeSlider.type = 'range';
  sizeSlider.className = 'canvas-stroke-slider';
  sizeSlider.min = String(MIN_SIZE);
  sizeSlider.max = String(maxSize);
  sizeSlider.step = '1';
  sizeSlider.setAttribute('aria-label', 'Stroke size');
  element.append(sizeSlider);

  // The slider gives only whole numbers from MIN_SIZE to maxSize
  function onSliderInput() {
    setStrokeSize(Number(sizeSlider.value));
  }
  sizeSlider.addEventListener('input', onSliderInput);

  // --- size number input ---

  const sizeInput = document.createElement('input');
  sizeInput.type = 'number';
  sizeInput.className = 'canvas-stroke-size';
  sizeInput.min = String(MIN_SIZE);
  sizeInput.max = String(maxSize);
  sizeInput.step = '1';
  sizeInput.setAttribute('aria-label', 'Stroke size number');
  element.append(sizeInput);

  // Changes the typed text to a whole number from MIN_SIZE to maxSize.
  // Text that is not a number gives the current stroke size.
  function sizeFromText(text) {
    const typedNumber = Number(text);
    if (text === '' || Number.isFinite(typedNumber) == false) {
      return strokeSize;
    }

    let size = Math.round(typedNumber);
    if (size < MIN_SIZE) {
      size = MIN_SIZE;
    }
    if (size > maxSize) {
      size = maxSize;
    }
    return size;
  }

  function onSizeChange() {
    const size = sizeFromText(sizeInput.value);
    setStrokeSize(size);

    // Show the valid size, also when the stroke size did not change
    sizeInput.value = String(size);
  }
  sizeInput.addEventListener('change', onSizeChange);

  // --- shape buttons ---

  // The button of each shape, by shape name
  const shapeButtons = {};

  // Makes one shape button. A click makes its shape the stroke shape.
  function createShapeButton(shape) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'canvas-stroke-shape';
    button.textContent = SHAPE_LABELS[shape];
    button.dataset.shape = shape;

    function onClick() {
      setStrokeShape(shape);
    }
    button.addEventListener('click', onClick);

    return button;
  }

  for (const shape of STROKE_SHAPES) {
    const button = createShapeButton(shape);
    shapeButtons[shape] = button;
    element.append(button);
  }

  // Shows the stroke size in the slider and the number input,
  // and the button of the stroke shape as pressed
  function show(size, activeShape) {
    sizeSlider.value = String(size);
    sizeInput.value = String(size);
    for (const shape of STROKE_SHAPES) {
      const isActive = shape === activeShape;
      shapeButtons[shape].setAttribute('aria-pressed', String(isActive));
      shapeButtons[shape].classList.toggle('active', isActive);
    }
  }

  show(strokeSize, strokeShape);
  containerElement.append(element);

  // show the stroke state again each time the tool state changes
  function onToolChange(state) {
    show(state.strokeSize, state.strokeShape);
  }
  const unsubscribe = subscribe(onToolChange);

  function destroy() {
    unsubscribe();
    element.remove();
  }

  return { element, destroy };
}
