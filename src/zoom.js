export const canvas = document.querySelector('#drawing');
export const canvasWrap = document.querySelector('.canvas-wrap');

export const state = {
  scale: 1,
  panX: 0,
  panY: 0,
  isPanning: false,
  panStart: null,
};

export const MIN_SCALE = 1;
export const MAX_SCALE = 4;
export const ZOOM_SPEED = 0.005; // per wheel delta unit (trackpad deltas are smaller than mouse wheel)

export function updateTransform() {
  canvasWrap.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.scale})`;
  document.getElementById('zoom-value').textContent = `${Math.round(state.scale * 100)}%`;
}

export function clampPan() {
  const stage = canvasWrap.parentElement;

  const stageWidth = stage.clientWidth;
  const stageHeight = stage.clientHeight;

  const canvasWidth = canvasWrap.offsetWidth * state.scale;
  const canvasHeight = canvasWrap.offsetHeight * state.scale;

  if (canvasWidth <= stageWidth) {
    state.panX = (stageWidth - canvasWidth) / 2;
  } else {
    state.panX = Math.min(0, Math.max(stageWidth - canvasWidth, state.panX));
  }

  if (canvasHeight <= stageHeight) {
    state.panY = (stageHeight - canvasHeight) / 2;
  } else {
    state.panY = Math.min(0, Math.max(stageHeight - canvasHeight, state.panY));
  }

  updateTransform();
}

export function screenToCanvas(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  // rect is the post-transform screen box: left/top include pan, width/height include scale
  const canvasX = (clientX - rect.left) * (canvas.width / rect.width);
  const canvasY = (clientY - rect.top) * (canvas.height / rect.height);
  return [Math.floor(canvasX), Math.floor(canvasY)];
}

export function pointFromEvent(event) {
  return screenToCanvas(event.clientX, event.clientY);
}

export function adjustScale(next, anchorX = null, anchorY = null) {
  next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));

  if (next === state.scale) return;

  const rect = canvasWrap.getBoundingClientRect();

  const x = anchorX ?? rect.left + rect.width / 2;
  const y = anchorY ?? rect.top + rect.height / 2;

  const relativeX = (x - rect.left) / rect.width;
  const relativeY = (y - rect.top) / rect.height;

  state.scale = next;

  updateTransform();

  const newRect = canvasWrap.getBoundingClientRect();

  state.panX += x - (newRect.left + relativeX * newRect.width);
  state.panY += y - (newRect.top + relativeY * newRect.height);

  clampPan();
}

export function resetZoom() {
  state.scale = 1;

  const stage = canvasWrap.parentElement;

  state.panX = (stage.clientWidth - canvasWrap.offsetWidth) / 2;
  state.panY = (stage.clientHeight - canvasWrap.offsetHeight) / 2;

  updateTransform();
}

export function startPan(clientX, clientY) {
  state.isPanning = true;
  state.panStart = [clientX, clientY];
  canvas.classList.add('panning');
  canvas.style.cursor = 'grabbing';
}