/**
 * Draws the hue ring and the saturation/value square of the color picker on <canvas> elements.
 * @module pickerDrawing
 */

/** Ring thickness as a part of the wheel width. */
export const RING_THICKNESS = 0.1;
/** Square side as a part of the wheel width: the square is inscribed in the ring's inner circle (its corners touch the ring). */
export const SQUARE_SIDE = (0.5 - RING_THICKNESS) * Math.SQRT2;

// Match the canvas pixels to the screen pixels, so the ring edge stays sharp on high-density screens.
function prepareCanvas(canvas) {
  const cssSize = canvas.clientWidth;
  const scale = window.devicePixelRatio || 1;
  canvas.width = canvas.height = Math.round(cssSize * scale);
  const context = canvas.getContext('2d');
  context.setTransform(scale, 0, 0, scale, 0, 0);
  return { context, cssSize };
}

/**
 * Draws the hue ring: hue 0 (red) at the top, growing clockwise.
 * @param {HTMLCanvasElement} canvas - Square canvas that covers the whole wheel
 */
export function drawHueRing(canvas) {
  const { context, cssSize } = prepareCanvas(canvas);
  if (cssSize === 0) return;
  const thickness = cssSize * RING_THICKNESS;
  const middleRadius = cssSize / 2 - thickness / 2;
  context.lineWidth = thickness;
  // Canvas angles start at 3 o'clock, so subtract 90° to start at 12 o'clock.
  // Each slice overlaps the next one a little, so no thin gaps show between them.
  for (let hue = 0; hue < 360; hue++) {
    const start = ((hue - 90 - 0.5) * Math.PI) / 180;
    const end = ((hue - 90 + 1.5) * Math.PI) / 180;
    context.beginPath();
    context.strokeStyle = `hsl(${hue}, 100%, 50%)`;
    context.arc(cssSize / 2, cssSize / 2, middleRadius, start, end);
    context.stroke();
  }
}

/**
 * Draws the saturation/value square for one hue: white on the left, full color on the right, black at the bottom.
 * @param {HTMLCanvasElement} canvas - The square canvas
 * @param {number} hue - 0–360 degrees
 */
export function drawSvSquare(canvas, hue) {
  const { context, cssSize } = prepareCanvas(canvas);
  if (cssSize === 0) return;
  context.fillStyle = `hsl(${hue}, 100%, 50%)`;
  context.fillRect(0, 0, cssSize, cssSize);
  const whiteToClear = context.createLinearGradient(0, 0, cssSize, 0);
  whiteToClear.addColorStop(0, 'rgba(255, 255, 255, 1)');
  whiteToClear.addColorStop(1, 'rgba(255, 255, 255, 0)');
  context.fillStyle = whiteToClear;
  context.fillRect(0, 0, cssSize, cssSize);
  const clearToBlack = context.createLinearGradient(0, 0, 0, cssSize);
  clearToBlack.addColorStop(0, 'rgba(0, 0, 0, 0)');
  clearToBlack.addColorStop(1, 'rgba(0, 0, 0, 1)');
  context.fillStyle = clearToBlack;
  context.fillRect(0, 0, cssSize, cssSize);
}
