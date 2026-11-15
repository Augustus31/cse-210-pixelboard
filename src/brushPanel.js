/**
 * The small panel under the pencil and eraser buttons: brush size (slider + number) and shape.
 * Each tool keeps its own settings object; this module only reads and writes those objects.
 * @module brushPanel
 */
import { clampBrushSize, maxBrushSize } from './brush.js';

/**
 * Connects the brush panel elements to the per-tool settings.
 * @param {Object} options
 * @param {Object<string, {size: number, shape: 'square'|'round'}>} options.settingsByTool - Settings for 'pencil' and 'eraser'
 * @param {() => number} options.getCanvasSize - Current canvas width and height in cells
 * @returns {{open: Function, close: Function, openTool: () => (string|null), clampToCanvas: Function}}
 */
export function createBrushPanel({ settingsByTool, getCanvasSize }) {
  const panel = document.getElementById('brush-panel');
  const sizeSlider = document.getElementById('brush-size-range');
  const sizeNumber = document.getElementById('brush-size-number');
  const sizeMaximum = document.getElementById('brush-size-max');
  const shapeButtons = panel.querySelectorAll('[data-shape]');
  let currentTool = null;
  let currentButton = null;

  function showSettings() {
    const settings = settingsByTool[currentTool];
    const maximum = maxBrushSize(getCanvasSize());
    sizeSlider.max = sizeNumber.max = String(maximum);
    sizeSlider.value = sizeNumber.value = String(settings.size);
    sizeMaximum.textContent = `/ ${maximum}`;
    shapeButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.shape === settings.shape)));
  }

  function setSize(value) {
    const settings = settingsByTool[currentTool];
    settings.size = clampBrushSize(value, getCanvasSize(), settings.size);
    showSettings();
  }

  function open(toolName, button) {
    currentTool = toolName;
    currentButton = button;
    panel.style.left = `${button.offsetLeft}px`;
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    showSettings();
  }

  function close() {
    if (currentTool === null) return;
    panel.hidden = true;
    currentButton.setAttribute('aria-expanded', 'false');
    currentTool = null;
    currentButton = null;
  }

  // A smaller canvas has a smaller maximum, so sizes that are now too large shrink to fit.
  function clampToCanvas(canvasSize) {
    for (const settings of Object.values(settingsByTool)) settings.size = clampBrushSize(settings.size, canvasSize, settings.size);
    if (currentTool !== null) showSettings();
  }

  // The slider updates on every move; the number input waits for Enter or blur so typing "12" is not cut to "1".
  sizeSlider.addEventListener('input', () => setSize(sizeSlider.value));
  sizeNumber.addEventListener('change', () => setSize(sizeNumber.value));
  shapeButtons.forEach((button) => button.addEventListener('click', () => {
    settingsByTool[currentTool].shape = button.dataset.shape;
    showSettings();
  }));

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || currentTool === null) return;
    const button = currentButton;
    close();
    button.focus();
  });
  document.addEventListener('pointerdown', (event) => {
    if (currentTool === null || panel.contains(event.target) || event.target.closest('#pencil, #eraser')) return;
    close();
  });

  return { open, close, openTool: () => currentTool, clampToCanvas };
}
