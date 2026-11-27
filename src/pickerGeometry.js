/**
 * Pure geometry for the color picker: where a hue sits on the ring and where S/V sit in the square.
 * Screen coordinates: x grows to the right, y grows down.
 * @module pickerGeometry
 */

/**
 * Hue from a point's offset to the ring center. Hue 0 is at the top and grows clockwise.
 * @param {number} dx - Horizontal offset from the center
 * @param {number} dy - Vertical offset from the center (positive is down)
 * @returns {number} Hue from 0 up to (not including) 360
 */
export function hueFromOffset(dx, dy) {
  const degrees = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return (degrees + 360) % 360;
}

/**
 * Offset from the ring center for a hue, at a given distance.
 * @param {number} hue - 0–360 degrees
 * @param {number} radius - Distance from the center
 * @returns {number[]} [dx, dy]
 */
export function offsetFromHue(hue, radius) {
  const radians = (hue * Math.PI) / 180;
  return [radius * Math.sin(radians), -radius * Math.cos(radians)];
}

const clampPercent = (value) => Math.min(100, Math.max(0, value));

/**
 * S and V from a point inside the square. Points outside the square are clamped to its edge.
 * @param {number} x - Distance from the square's left edge
 * @param {number} y - Distance from the square's top edge
 * @param {number} side - Square side length
 * @returns {{s: number, v: number}} Both 0–100
 */
export function svFromSquarePoint(x, y, side) {
  return { s: clampPercent((x / side) * 100), v: clampPercent((1 - y / side) * 100) };
}

/**
 * Point inside the square for S and V.
 * @param {number} s - 0–100
 * @param {number} v - 0–100
 * @param {number} side - Square side length
 * @returns {number[]} [x, y] from the square's top-left corner
 */
export function squarePointFromSv(s, v, side) {
  return [(s / 100) * side, (1 - v / 100) * side];
}
