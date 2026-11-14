// Bresenham's line algorithm fills gaps when the pointer moves faster than events arrive.
export function linePixels(from, to) {
  let [x, y] = from;
  const [endX, endY] = to;
  const dx = Math.abs(endX - x), dy = -Math.abs(endY - y);
  const sx = x < endX ? 1 : -1, sy = y < endY ? 1 : -1;
  let error = dx + dy;
  const points = [];
  while (true) {
    points.push([x, y]);
    if (x === endX && y === endY) return points;
    const doubled = 2 * error;
    if (doubled >= dy) { error += dy; x += sx; }
    if (doubled <= dx) { error += dx; y += sy; }
  }
}
