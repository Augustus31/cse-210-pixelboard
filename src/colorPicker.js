/**
 * The custom color picker: hue ring, saturation/value square, and the Advanced controls.
 * The picker state is HSV. RGB and hex are computed from it.
 * @module colorPicker
 */
import { hsvToRgb, rgbToHsv, rgbToHex, hexToRgb } from './color.js';
import { hueFromOffset, offsetFromHue, svFromSquarePoint, squarePointFromSv } from './pickerGeometry.js';
import { RING_THICKNESS, SQUARE_SIDE, drawHueRing, drawSvSquare } from './pickerDrawing.js';
import { createColorChannels } from './colorChannels.js';

const SMALL_STEP = 1;
const BIG_STEP = 10;
const clampPercent = (value) => Math.min(100, Math.max(0, value));

/**
 * Connects the color picker elements.
 * @param {Object} options
 * @param {(hex: string) => void} options.onUserChange - Called with '#rrggbb' each time the user changes the color in the picker
 * @returns {{showColor: (hex: string) => void}} showColor() moves the picker to a color chosen somewhere else (swatch, eyedropper)
 */
export function createColorPicker({ onUserChange }) {
  const wheel = document.getElementById('color-wheel');
  const ring = document.getElementById('hue-ring');
  const square = document.getElementById('sv-square');
  const hueMarker = document.getElementById('hue-marker');
  const squareMarker = document.getElementById('sv-marker');
  const channels = createColorChannels({ onUserInput: changeFromUser });
  let hsv = { h: 0, s: 0, v: 0 };
  let drawnHue = null;

  placeSquare();

  function placeSquare() {
    const offset = `${((1 - SQUARE_SIDE) / 2) * 100}%`;
    square.style.left = square.style.top = offset;
    square.style.width = square.style.height = `${SQUARE_SIDE * 100}%`;
  }

  function showMarkers() {
    const [dx, dy] = offsetFromHue(hsv.h, 0.5 - RING_THICKNESS / 2);
    hueMarker.style.left = `${(0.5 + dx) * 100}%`;
    hueMarker.style.top = `${(0.5 + dy) * 100}%`;
    const [x, y] = squarePointFromSv(hsv.s, hsv.v, SQUARE_SIDE);
    const squareStart = (1 - SQUARE_SIDE) / 2;
    squareMarker.style.left = `${(squareStart + x) * 100}%`;
    squareMarker.style.top = `${(squareStart + y) * 100}%`;
    const hex = rgbToHex(hsvToRgb(hsv));
    squareMarker.style.background = hex;
    hueMarker.style.background = `hsl(${hsv.h}, 100%, 50%)`;
  }

  function showAccessibleValues() {
    ring.setAttribute('aria-valuenow', String(Math.round(hsv.h)));
    square.setAttribute('aria-valuetext', `Saturation ${Math.round(hsv.s)}%, brightness ${Math.round(hsv.v)}%`);
  }

  // The square only needs a redraw when the hue changes.
  function showState() {
    if (drawnHue !== hsv.h) {
      drawSvSquare(square, hsv.h);
      drawnHue = hsv.h;
    }
    showMarkers();
    showAccessibleValues();
    channels.show(hsv);
  }

  function changeFromUser(nextHsv) {
    hsv = nextHsv;
    showState();
    onUserChange(rgbToHex(hsvToRgb(hsv)));
  }

  function showColor(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return;
    // Keep the last hue for grays, so the ring marker does not jump to red.
    hsv = rgbToHsv(rgb, hsv.h);
    showState();
  }

  function hueFromPointer(event) {
    const rect = wheel.getBoundingClientRect();
    return hueFromOffset(event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2);
  }

  function svFromPointer(event) {
    const rect = square.getBoundingClientRect();
    return svFromSquarePoint(event.clientX - rect.left, event.clientY - rect.top, rect.width);
  }

  // Pointer capture keeps the drag working when the pointer leaves the ring or the square.
  function connectDrag(element, readPointer) {
    element.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      element.focus({ preventScroll: true });
      element.setPointerCapture(event.pointerId);
      changeFromUser(readPointer(event));
    });
    element.addEventListener('pointermove', (event) => {
      if (element.hasPointerCapture(event.pointerId)) changeFromUser(readPointer(event));
    });
  }

  connectDrag(ring, (event) => ({ ...hsv, h: hueFromPointer(event) }));
  connectDrag(square, (event) => ({ ...hsv, ...svFromPointer(event) }));

  ring.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? BIG_STEP : SMALL_STEP;
    const change = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step }[event.key];
    if (change === undefined) return;
    event.preventDefault();
    changeFromUser({ ...hsv, h: (((Math.round(hsv.h) + change) % 360) + 360) % 360 });
  });
  square.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? BIG_STEP : SMALL_STEP;
    const change = { ArrowRight: ['s', step], ArrowLeft: ['s', -step], ArrowUp: ['v', step], ArrowDown: ['v', -step] }[event.key];
    if (change === undefined) return;
    event.preventDefault();
    const [key, amount] = change;
    changeFromUser({ ...hsv, [key]: clampPercent(Math.round(hsv[key]) + amount) });
  });

  // The wheel has no size while its section is closed, so redraw when it gets a size.
  new ResizeObserver(() => {
    drawHueRing(ring);
    drawSvSquare(square, hsv.h);
    drawnHue = hsv.h;
  }).observe(wheel);

  return { showColor };
}
