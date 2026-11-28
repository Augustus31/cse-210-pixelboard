/**
 * Stroke patterns: the cells that a drawing tool (pencil or eraser) changes.
 * Each function here only gives a list of cells. It does not change the grid or the DOM.
 * A cell in a list can be outside the grid. setCell() ignores those cells.
 * @module canvas/stroke
 */

// The stroke shapes
export const STROKE_SHAPES = ['square', 'round'];

/**
 * Tells if a position in a round stamp is inside the circle.
 * @param {number} stampRow - The row in the stamp, 0 is the top row of the stamp
 * @param {number} stampColumn - The column in the stamp, 0 is the left column of the stamp
 * @param {number} size - The width and height of the stamp, in cells
 * @returns {boolean} true when the position is inside the circle
 */
function isInRoundStamp(stampRow, stampColumn, size) {

  // A radius of exactly size / 2 makes a size 3 stamp a full square, so use a smaller radius
  const radius = size / 2 - 0.25;

  // the distance from the center of the stamp to the center of the cell
  const distanceX = stampColumn + 0.5 - size / 2;
  const distanceY = stampRow + 0.5 - size / 2;

  const distanceSquared = distanceX * distanceX + distanceY * distanceY;
  return distanceSquared <= radius * radius;
}

/**
 * Gives the cells of one stamp (the tool pressed on one cell, with no movement).
 * For an even size, the stamp cannot have one center cell.
 * The pointer cell is then the top left cell of the 2 x 2 center.
 * @param {number} row - The row of the pointer cell
 * @param {number} column - The column of the pointer cell
 * @param {number} [size=1] - The width and height of the stamp, in cells, 1 or more
 * @param {'square'|'round'} [shape='square'] - The shape of the stamp
 * @returns {{row: number, column: number}[]} The cells of the stamp
 */
export function stampCells(row, column, size = 1, shape = 'square') {

  // the top left cell of the stamp
  const offset = Math.floor((size - 1) / 2);
  const top = row - offset;
  const left = column - offset;

  const cells = [];
  for (let stampRow = 0; stampRow < size; stampRow++) {
    for (let stampColumn = 0; stampColumn < size; stampColumn++) {
      let isInStamp = true;
      if (shape === 'round') {
        isInStamp = isInRoundStamp(stampRow, stampColumn, size);
      }
      if (isInStamp) {
        cells.push({ row: top + stampRow, column: left + stampColumn });
      }
    }
  }
  return cells;
}

/**
 * Gives the cells on a straight line between two cells (the Bresenham line algorithm).
 * Pointer events arrive slower than a fast stroke moves. This line fills the gap
 * between the cell of the last event and the cell of the current event.
 * @param {number} fromRow - The row of the first cell
 * @param {number} fromColumn - The column of the first cell
 * @param {number} toRow - The row of the last cell
 * @param {number} toColumn - The column of the last cell
 * @returns {{row: number, column: number}[]} The cells in order, with the first and last cell
 */
export function lineCells(fromRow, fromColumn, toRow, toColumn) {
  const rowDistance = Math.abs(toRow - fromRow);
  const columnDistance = Math.abs(toColumn - fromColumn);

  // the direction of one step: 1 is down or right, -1 is up or left
  let rowStep = 1;
  if (toRow < fromRow) {
    rowStep = -1;
  }
  let columnStep = 1;
  if (toColumn < fromColumn) {
    columnStep = -1;
  }

  const cells = [];
  let row = fromRow;
  let column = fromColumn;

  // the error tells how far the current cell is from the ideal line
  let error = columnDistance - rowDistance;

  while (true) {
    cells.push({ row, column });

    const isAtEnd = row === toRow && column === toColumn;
    if (isAtEnd) break;

    const doubleError = error * 2;

    // move one column when the line is more horizontal at this point
    if (doubleError > -rowDistance) {
      error = error - rowDistance;
      column = column + columnStep;
    }

    // move one row when the line is more vertical at this point
    if (doubleError < columnDistance) {
      error = error + columnDistance;
      row = row + rowStep;
    }
  }
  return cells;
}

/**
 * Gives the cells of a stroke between two cells: one stamp for each cell on the line.
 * Each cell is in the list one time only.
 * @param {number} fromRow - The row of the first pointer cell
 * @param {number} fromColumn - The column of the first pointer cell
 * @param {number} toRow - The row of the last pointer cell
 * @param {number} toColumn - The column of the last pointer cell
 * @param {number} [size=1] - The width and height of the tool, in cells, 1 or more
 * @param {'square'|'round'} [shape='square'] - The shape of the tool
 * @returns {{row: number, column: number}[]} The cells of the stroke
 */
export function strokeCells(fromRow, fromColumn, toRow, toColumn, size = 1, shape = 'square') {
  const cells = [];

  // the cells that are in the list, as 'row,column' text
  const usedCells = new Set();

  const centerCells = lineCells(fromRow, fromColumn, toRow, toColumn);
  for (const center of centerCells) {
    const stamp = stampCells(center.row, center.column, size, shape);
    for (const cell of stamp) {
      const key = `${cell.row},${cell.column}`;
      if (usedCells.has(key)) continue;
      usedCells.add(key);
      cells.push(cell);
    }
  }
  return cells;
}
