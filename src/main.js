import { linePixels, colorAtCell } from './pixels.js';
import { brushCells, cellsInsideCanvas } from './brush.js';
import { createBrushPanel } from './brushPanel.js';
import { showBrushOutline, hideBrushOutline } from './brushOutline.js';
import { createColorPicker } from './colorPicker.js';
import { blendHex } from './color.js';
import { loadSectionState, saveSectionState } from './colorSections.js';
import { createRecentColorsRow } from './recentColorsRow.js';
import { createDraftsColumn } from './draftsColumn.js';

const SIZES = [64, 40, 25];
let size = 64;
const STORAGE_KEY = 'pixelboard-v1';
const canvas = document.querySelector('#drawing');
const context = canvas.getContext('2d');
const $ = (id) => document.getElementById(id);
const colors = [
  '#292a35', '#62616e', '#a3a1ad', '#d1ced6', '#eeecf1', '#ffffff',
  '#a84651', '#d66376', '#ee92a4', '#f5bac8', '#edb8a0', '#f5d2bb',
  '#bd743d', '#e5a34f', '#f3c660', '#f6df91', '#d5bc7b', '#a49365',
  '#3d6c58', '#689773', '#93b88a', '#bed2a4', '#7faaa3', '#b1d1c5',
  '#3d557b', '#5c81ae', '#85afd0', '#b3d1df', '#6a9ba9', '#95bfcc',
  '#51457f', '#6d5ce7', '#9680c4', '#c1addd', '#b27ca8', '#dab0cc',
];
let pixels = Array(size * size).fill('#ffffff');
let selectedColor = '#6d5ce7';
// Opacity of the pencil, 0–100. At 100 the pencil works the same as before alpha existed.
let selectedAlpha = 100;
let tool = 'pencil';
let lastPoint = null;
let activePointer = null;
let strokeBefore = null;
let keyboardPoint = [0, 0];
let keyboardStrokeBefore = null;
let undoStack = [], redoStack = [];
// Keep a separate drawing and undo history for each resolution during this session.
const drawings = {};
// Users often erase with a bigger brush than they draw with, so each tool keeps its own settings.
const brushSettings = { pencil: { size: 1, shape: 'square' }, eraser: { size: 1, shape: 'square' } };
const brushPanel = createBrushPanel({ settingsByTool: brushSettings, getCanvasSize: () => size });

// Store pixel colors rather than a scaled image: exports match the selected resolution.
function render() {
  pixels.forEach((color, index) => {
    context.fillStyle = color;
    context.fillRect(index % size, Math.floor(index / size), 1, 1);
  });
}
function save() {
  try {
    drawings[size] = { pixels, undoStack, redoStack };
    const savedDrawings = Object.fromEntries(Object.entries(drawings).map(([resolution, drawing]) => [resolution, drawing.pixels]));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ size, drawings: savedDrawings }));
    $('save-status').textContent = 'Saved in this browser · just for you';
  } catch {
    $('save-status').textContent = 'Browser storage unavailable. Download to keep your drawing.';
  }
}
function updateHistory() {
  $('undo').disabled = undoStack.length === 0;
  $('redo').disabled = redoStack.length === 0;
}
// One drag is one undo step. Cap history to avoid unbounded memory growth.
// Returns true when the drawing changed, so callers can tell if the stroke did anything.
function commit(before) {
  if (!before || before.every((color, index) => color === pixels[index])) return false;
  undoStack.push(before);
  if (undoStack.length > 100) undoStack.shift();
  redoStack.length = 0;
  updateHistory();
  save();
  return true;
}
function selectTool(next) {
  tool = next;
  if (brushPanel.openTool() !== null && brushPanel.openTool() !== next) brushPanel.close();
  for (const name of ['pencil', 'eraser', 'eyedropper']) {
    $(name).classList.toggle('active', name === next);
    $(name).setAttribute('aria-pressed', String(name === next));
  }
  canvas.classList.toggle('picking', next === 'eyedropper');
}
// Used by the picker itself. It does not move the picker, so the picker keeps its exact HSV (and its hue for grays).
function useColor(color, alpha) {
  selectedColor = color.toLowerCase();
  selectedAlpha = alpha;
  $('color-preview-fill').style.background = selectedColor;
  $('color-preview-fill').style.opacity = String(selectedAlpha / 100);
  $('color-value').textContent = selectedColor.toUpperCase();
  $('alpha-value').textContent = `${Math.round(selectedAlpha)}%`;
  document.querySelectorAll('.swatch').forEach((button) => {
    const selected = button.dataset.color === selectedColor;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  selectTool('pencil');
}
const colorPicker = createColorPicker({ onUserChange: useColor });
// Used for colors chosen outside the picker (swatches, eyedropper), so the picker moves to show them.
// Swatch and eyedropper colors are opaque, so alpha goes back to 100% unless a caller gives another value.
function selectColor(color, alpha = 100) {
  colorPicker.showColor(color, alpha);
  useColor(color, alpha);
}
colors.forEach((color) => {
  const button = document.createElement('button');
  button.className = 'swatch';
  button.style.setProperty('--color', color);
  button.dataset.color = color;
  button.setAttribute('aria-label', `Use color ${color}`);
  button.title = color.toUpperCase();
  button.addEventListener('click', () => selectColor(color));
  $('palette').append(button);
});
$('color-count').textContent = `${colors.length} shades`;
function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null; // Some privacy settings block storage access completely.
  }
}
// Each closable part of the Colors card remembers if it was open.
function connectColorSections() {
  const storage = browserStorage();
  const state = loadSectionState(storage);
  document.querySelectorAll('details[data-section]').forEach((section) => {
    section.open = state[section.dataset.section];
    section.addEventListener('toggle', () => {
      state[section.dataset.section] = section.open;
      saveSectionState(storage, state);
    });
  });
}
connectColorSections();
// A recent color restores both the color and its alpha.
const recentColorsRow = createRecentColorsRow({ storage: browserStorage(), onPick: (color, alpha) => selectColor(color, alpha) });
// Only pencil strokes that changed at least one cell count as "used". Moving the picker or erasing does not.
function rememberStrokeColor(strokeChangedDrawing) {
  if (strokeChangedDrawing && tool === 'pencil') recentColorsRow.remember(selectedColor, selectedAlpha);
}
// A click on the active tool button while its panel is open closes the panel; any other click opens it.
function toggleBrushPanel(toolName) {
  if (tool === toolName && brushPanel.openTool() === toolName) {
    brushPanel.close();
    return;
  }
  selectTool(toolName);
  brushPanel.open(toolName, $(toolName));
}
$('pencil').addEventListener('click', () => toggleBrushPanel('pencil'));
$('eraser').addEventListener('click', () => toggleBrushPanel('eraser'));
$('eyedropper').addEventListener('click', () => selectTool('eyedropper'));
$('grid').addEventListener('change', (event) => { $('grid-overlay').hidden = !event.target.checked; });

function pointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return [Math.floor((event.clientX - rect.left) / rect.width * size), Math.floor((event.clientY - rect.top) / rect.height * size)];
}
function currentBrushCells(x, y) {
  const { size: brushSize, shape } = brushSettings[tool];
  return cellsInsideCanvas(brushCells(x, y, brushSize, shape), size);
}
// The pencil blends against the cell color from before the stroke (strokeBase), not the current one,
// so a drag that passes over the same cell again does not make it darker. The eraser is always opaque white.
function paintedColor(index, strokeBase) {
  if (tool === 'eraser') return '#ffffff';
  return blendHex(selectedColor, strokeBase[index], selectedAlpha / 100);
}
// Stamp the brush at every point of the line, so fast drags leave no gaps.
function paint(from, to, strokeBase) {
  for (const [x, y] of linePixels(from, to)) {
    for (const [cellX, cellY] of currentBrushCells(x, y)) {
      const index = cellY * size + cellX;
      pixels[index] = paintedColor(index, strokeBase);
    }
  }
  render();
}
function updateBrushOutline(point) {
  if (activePointer !== null || !brushSettings[tool]) return hideBrushOutline();
  showBrushOutline(currentBrushCells(point[0], point[1]), size);
}
// Picking only reads the drawing, so it creates no undo step. selectColor() switches back to the pencil.
function pickColor(point) {
  const color = colorAtCell(pixels, size, point);
  if (color !== null) selectColor(color);
}
function finishStroke() {
  finishKeyboardStroke();
  if (activePointer === null) return;
  activePointer = null;
  lastPoint = null;
  rememberStrokeColor(commit(strokeBefore));
  strokeBefore = null;
}
canvas.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || activePointer !== null) return;
  finishKeyboardStroke();
  canvas.focus({ preventScroll: true });
  $('cursor').hidden = true;
  hideBrushOutline();
  if (tool === 'eyedropper') return pickColor(pointFromEvent(event));
  activePointer = event.pointerId;
  canvas.setPointerCapture(event.pointerId);
  strokeBefore = pixels.slice();
  lastPoint = pointFromEvent(event);
  paint(lastPoint, lastPoint, strokeBefore);
});
canvas.addEventListener('pointermove', (event) => {
  const point = pointFromEvent(event);
  $('position').textContent = `${Math.max(0, Math.min(size - 1, point[0]))}, ${Math.max(0, Math.min(size - 1, point[1]))} · ${size} × ${size}`;
  if (event.pointerId !== activePointer) return updateBrushOutline(point);
  paint(lastPoint, point, strokeBefore);
  lastPoint = point;
});
// Capture keeps a drag consistent when it crosses the canvas edge; cancellation commits safely.
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  canvas.addEventListener(name, (event) => { if (event.pointerId === activePointer) finishStroke(); });
}
canvas.addEventListener('pointerleave', () => {
  $('position').textContent = `${size} × ${size} pixels`;
  hideBrushOutline();
});
$('undo').addEventListener('click', () => {
  finishStroke();
  if (!undoStack.length) return;
  redoStack.push(pixels.slice());
  pixels = undoStack.pop();
  render(); updateHistory(); save();
});
$('redo').addEventListener('click', () => {
  finishStroke();
  if (!redoStack.length) return;
  undoStack.push(pixels.slice());
  pixels = redoStack.pop();
  render(); updateHistory(); save();
});
// Erase all affects only the current resolution and stays reversible with Undo.
$('clear').addEventListener('click', () => {
  finishStroke();
  const before = pixels.slice();
  pixels.fill('#ffffff');
  render(); commit(before);
});
$('download').addEventListener('click', () => {
  finishStroke();
  const link = document.createElement('a');
  link.download = 'pixelboard.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

// Holding Space makes arrow movement a single continuous, undoable drawing stroke.
function finishKeyboardStroke() {
  const before = keyboardStrokeBefore;
  keyboardStrokeBefore = null;
  rememberStrokeColor(commit(before));
}
canvas.addEventListener('keydown', (event) => {
  if (activePointer !== null) return;
  const movements = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (movements[event.key]) {
    event.preventDefault();
    const previousPoint = keyboardPoint;
    keyboardPoint = keyboardPoint.map((value, axis) => Math.max(0, Math.min(size - 1, value + movements[event.key][axis])));
    if (keyboardStrokeBefore) paint(previousPoint, keyboardPoint, keyboardStrokeBefore);
  } else if (event.key === ' ') {
    event.preventDefault();
    // Ignore auto-repeat until a fresh Space press, including after focus loss.
    if (!event.repeat && !keyboardStrokeBefore) {
      if (tool === 'eyedropper') pickColor(keyboardPoint);
      else {
        keyboardStrokeBefore = pixels.slice();
        paint(keyboardPoint, keyboardPoint, keyboardStrokeBefore);
      }
    }
  } else if (event.key === 'Enter') {
    event.preventDefault();
    finishKeyboardStroke();
    if (tool === 'eyedropper') pickColor(keyboardPoint);
    else {
      const before = pixels.slice();
      paint(keyboardPoint, keyboardPoint, before);
      rememberStrokeColor(commit(before));
    }
  } else return;
  $('cursor').hidden = false;
  $('cursor').style.left = `${keyboardPoint[0] / size * 100}%`;
  $('cursor').style.top = `${keyboardPoint[1] / size * 100}%`;
  updateBrushOutline(keyboardPoint);
  $('position').textContent = `${keyboardPoint.join(', ')} · ${size} × ${size}`;
});
document.addEventListener('keyup', (event) => {
  if (event.key === ' ') finishKeyboardStroke();
});
// End a held-key stroke if focus leaves, even if keyup occurs outside the page.
canvas.addEventListener('blur', () => {
  finishKeyboardStroke();
  $('cursor').hidden = true;
  hideBrushOutline();
});
window.addEventListener('blur', finishKeyboardStroke);
document.addEventListener('keydown', (event) => {
  if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(event.target.tagName)) return;
  const key = event.key.toLowerCase();
  if ((event.ctrlKey || event.metaKey) && key === 'z') {
    event.preventDefault(); $(event.shiftKey ? 'redo' : 'undo').click();
  } else if (!event.ctrlKey && !event.metaKey && !event.altKey) {
    if (key === 'p') selectTool('pencil');
    if (key === 'e') selectTool('eraser');
    if (key === 'i') selectTool('eyedropper');
  }
});

// Resizing switches between independent drawings, so choosing a smaller canvas loses no artwork.
function updateCanvasSize() {
  canvas.width = canvas.height = size;
  document.querySelector('.canvas-wrap').style.setProperty('--pixel-count', size);
  canvas.setAttribute('aria-label', `${size} by ${size} drawing canvas. Drag to draw, or use arrow keys to move and Space to paint.`);
  $('canvas-size').value = String(size);
  $('size-label').textContent = `${size} × ${size} canvas`;
  $('position').textContent = `${size} × ${size} pixels`;
  keyboardPoint = [0, 0];
  $('cursor').hidden = true;
  hideBrushOutline();
  brushPanel.clampToCanvas(size);
  updateHistory();
  render();
}
function switchCanvasSize(nextSize) {
  finishStroke();
  drawings[size] = { pixels, undoStack, redoStack };
  size = nextSize;
  const drawing = drawings[size] ?? { pixels: Array(size * size).fill('#ffffff'), undoStack: [], redoStack: [] };
  ({ pixels, undoStack, redoStack } = drawing);
  updateCanvasSize();
  save();
}
$('canvas-size').addEventListener('change', (event) => {
  const nextSize = Number(event.target.value);
  if (!SIZES.includes(nextSize) || nextSize === size) return;
  switchCanvasSize(nextSize);
});

// Loading a draft changes to the draft's size first, then replaces that drawing as one undo step.
// commit() also runs the normal auto-save, so the loaded drawing is kept after a reload.
function applyDraft(draft) {
  finishStroke();
  if (draft.size !== size) switchCanvasSize(draft.size);
  const before = pixels.slice();
  pixels = draft.pixels.slice();
  render();
  commit(before);
}
createDraftsColumn({
  getCanvas: () => ({ size, pixels: pixels.slice() }),
  applyDraft,
  showStatus: (message) => { $('save-status').textContent = message; },
});

// Accept the original 64 × 64 save format as well as the new resolution-specific drawings.
try {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
  const savedDrawings = Array.isArray(stored) ? { 64: stored } : stored?.drawings;
  for (const resolution of SIZES) {
    const saved = savedDrawings?.[resolution];
    if (Array.isArray(saved) && saved.length === resolution * resolution && saved.every((color) => /^#[0-9a-f]{6}$/i.test(color))) {
      drawings[resolution] = { pixels: saved, undoStack: [], redoStack: [] };
    }
  }
  if (SIZES.includes(stored?.size)) size = stored.size;
  pixels = drawings[size]?.pixels ?? Array(size * size).fill('#ffffff');
} catch { /* Storage may be disabled or contain invalid JSON; start with a white canvas. */ }
selectColor(selectedColor);
updateCanvasSize();
