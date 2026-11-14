import { linePixels } from './pixels.js';

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
let tool = 'pencil';
let lastPoint = null;
let activePointer = null;
let strokeBefore = null;
let keyboardPoint = [0, 0];
let undoStack = [], redoStack = [];
// Keep a separate drawing and undo history for each resolution during this session.
const drawings = {};

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
function commit(before) {
  if (!before || before.every((color, index) => color === pixels[index])) return;
  undoStack.push(before);
  if (undoStack.length > 100) undoStack.shift();
  redoStack.length = 0;
  updateHistory();
  save();
}
function selectTool(next) {
  tool = next;
  for (const name of ['pencil', 'eraser']) {
    $(name).classList.toggle('active', name === next);
    $(name).setAttribute('aria-pressed', String(name === next));
  }
}
function selectColor(color) {
  selectedColor = color.toLowerCase();
  $('custom-color').value = selectedColor;
  $('color-value').textContent = selectedColor.toUpperCase();
  document.querySelectorAll('.swatch').forEach((button) => {
    const selected = button.dataset.color === selectedColor;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  selectTool('pencil');
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
$('custom-color').addEventListener('input', (event) => selectColor(event.target.value));
$('pencil').addEventListener('click', () => selectTool('pencil'));
$('eraser').addEventListener('click', () => selectTool('eraser'));
$('grid').addEventListener('change', (event) => { $('grid-overlay').hidden = !event.target.checked; });

function pointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return [Math.floor((event.clientX - rect.left) / rect.width * size), Math.floor((event.clientY - rect.top) / rect.height * size)];
}
function paint(from, to) {
  for (const [x, y] of linePixels(from, to)) {
    if (x >= 0 && x < size && y >= 0 && y < size) pixels[y * size + x] = tool === 'eraser' ? '#ffffff' : selectedColor;
  }
  render();
}
function finishStroke() {
  if (activePointer === null) return;
  activePointer = null;
  lastPoint = null;
  commit(strokeBefore);
  strokeBefore = null;
}
canvas.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || activePointer !== null) return;
  canvas.focus({ preventScroll: true });
  $('cursor').hidden = true;
  activePointer = event.pointerId;
  canvas.setPointerCapture(event.pointerId);
  strokeBefore = pixels.slice();
  lastPoint = pointFromEvent(event);
  paint(lastPoint, lastPoint);
});
canvas.addEventListener('pointermove', (event) => {
  const point = pointFromEvent(event);
  $('position').textContent = `${Math.max(0, Math.min(size - 1, point[0]))}, ${Math.max(0, Math.min(size - 1, point[1]))} · ${size} × ${size}`;
  if (event.pointerId !== activePointer) return;
  paint(lastPoint, point);
  lastPoint = point;
});
// Capture keeps a drag consistent when it crosses the canvas edge; cancellation commits safely.
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  canvas.addEventListener(name, (event) => { if (event.pointerId === activePointer) finishStroke(); });
}
canvas.addEventListener('pointerleave', () => { $('position').textContent = `${size} × ${size} pixels`; });
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

// Keyboard users can navigate individual pixels and paint without a pointer.
canvas.addEventListener('keydown', (event) => {
  const movements = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (movements[event.key]) {
    event.preventDefault();
    keyboardPoint = keyboardPoint.map((value, axis) => Math.max(0, Math.min(size - 1, value + movements[event.key][axis])));
  } else if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    const before = pixels.slice();
    paint(keyboardPoint, keyboardPoint); commit(before);
  } else return;
  $('cursor').hidden = false;
  $('cursor').style.left = `${keyboardPoint[0] / size * 100}%`;
  $('cursor').style.top = `${keyboardPoint[1] / size * 100}%`;
  $('position').textContent = `${keyboardPoint.join(', ')} · ${size} × ${size}`;
});
canvas.addEventListener('blur', () => { $('cursor').hidden = true; });
document.addEventListener('keydown', (event) => {
  if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(event.target.tagName)) return;
  const key = event.key.toLowerCase();
  if ((event.ctrlKey || event.metaKey) && key === 'z') {
    event.preventDefault(); $(event.shiftKey ? 'redo' : 'undo').click();
  } else if (!event.ctrlKey && !event.metaKey && !event.altKey) {
    if (key === 'p') selectTool('pencil');
    if (key === 'e') selectTool('eraser');
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
  updateHistory();
  render();
}
$('canvas-size').addEventListener('change', (event) => {
  const nextSize = Number(event.target.value);
  if (!SIZES.includes(nextSize) || nextSize === size) return;
  finishStroke();
  drawings[size] = { pixels, undoStack, redoStack };
  size = nextSize;
  const drawing = drawings[size] ?? { pixels: Array(size * size).fill('#ffffff'), undoStack: [], redoStack: [] };
  ({ pixels, undoStack, redoStack } = drawing);
  updateCanvasSize();
  save();
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
