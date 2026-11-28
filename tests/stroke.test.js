import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { stampCells, lineCells, strokeCells, STROKE_SHAPES } from '../src/canvas/stroke.js';

/** Changes a list of cells to a list of 'row,column' text, so the tests are easy to read. */
function asText(cells) {
  const texts = [];
  for (const cell of cells) {
    texts.push(`${cell.row},${cell.column}`);
  }
  return texts;
}

/** The same as asText, but in sorted order, for tests where the order is not important. */
function asSortedText(cells) {
  return asText(cells).sort();
}

describe('stampCells', () => {
  test('the default stamp is the pointer cell only', () => {
    assert.deepEqual(stampCells(5, 7), [{ row: 5, column: 7 }]);
  });

  test('a size 1 stamp is the pointer cell only, for each shape', () => {
    for (const shape of STROKE_SHAPES) {
      assert.deepEqual(asText(stampCells(5, 7, 1, shape)), ['5,7'], shape);
    }
  });

  test('a size 3 square stamp is 3 x 3 cells with the pointer cell in the center', () => {
    assert.deepEqual(asText(stampCells(5, 7, 3, 'square')), [
      '4,6', '4,7', '4,8',
      '5,6', '5,7', '5,8',
      '6,6', '6,7', '6,8',
    ]);
  });

  test('a size 2 square stamp grows to the right and down from the pointer cell', () => {
    assert.deepEqual(asText(stampCells(5, 7, 2, 'square')), ['5,7', '5,8', '6,7', '6,8']);
  });

  test('a size 4 square stamp has the pointer cell at the top left of the 2 x 2 center', () => {
    const cells = asText(stampCells(5, 7, 4, 'square'));
    assert.equal(cells.length, 16);
    assert.equal(cells[0], '4,6');
    assert.equal(cells[15], '7,9');
  });

  test('a size 3 round stamp is a plus shape, with no corner cells', () => {
    assert.deepEqual(asText(stampCells(5, 7, 3, 'round')), ['4,7', '5,6', '5,7', '5,8', '6,7']);
  });

  test('a size 5 round stamp has no corner cells', () => {
    const cells = asText(stampCells(10, 10, 5, 'round'));
    assert.equal(cells.length, 21);
    for (const corner of ['8,8', '8,12', '12,8', '12,12']) {
      assert.equal(cells.includes(corner), false, corner);
    }
  });

  test('a round stamp is the same when it is flipped', () => {
    for (const size of [2, 3, 4, 5, 6, 7, 8]) {
      const cells = stampCells(0, 0, size, 'round');
      const offset = Math.floor((size - 1) / 2);
      const last = size - 1;
      const flipped = [];
      for (const cell of cells) {
        // flip left to right inside the stamp
        const stampColumn = cell.column + offset;
        flipped.push({ row: cell.row, column: last - stampColumn - offset });
      }
      assert.deepEqual(asSortedText(flipped), asSortedText(cells), `size ${size}`);
    }
  });

  test('a stamp near the grid edge gives cells outside the grid', () => {
    assert.deepEqual(asText(stampCells(0, 0, 3, 'square')).includes('-1,-1'), true);
  });
});

describe('lineCells', () => {
  test('a line from a cell to the same cell is that cell only', () => {
    assert.deepEqual(asText(lineCells(2, 3, 2, 3)), ['2,3']);
  });

  test('a horizontal line has all cells between the two ends, in order', () => {
    assert.deepEqual(asText(lineCells(2, 1, 2, 4)), ['2,1', '2,2', '2,3', '2,4']);
  });

  test('a vertical line has all cells between the two ends, in order', () => {
    assert.deepEqual(asText(lineCells(1, 3, 4, 3)), ['1,3', '2,3', '3,3', '4,3']);
  });

  test('a diagonal line moves one row and one column for each cell', () => {
    assert.deepEqual(asText(lineCells(0, 0, 3, 3)), ['0,0', '1,1', '2,2', '3,3']);
  });

  test('a line to the left or up goes in that direction', () => {
    assert.deepEqual(asText(lineCells(2, 4, 2, 1)), ['2,4', '2,3', '2,2', '2,1']);
    assert.deepEqual(asText(lineCells(3, 3, 0, 0)), ['3,3', '2,2', '1,1', '0,0']);
  });

  test('a shallow line has one cell for each column', () => {
    const cells = lineCells(0, 0, 2, 6);
    assert.equal(cells.length, 7);
    for (let index = 0; index < cells.length; index++) {
      assert.equal(cells[index].column, index);
    }
  });

  test('a steep line has one cell for each row', () => {
    const cells = lineCells(0, 0, 6, 2);
    assert.equal(cells.length, 7);
    for (let index = 0; index < cells.length; index++) {
      assert.equal(cells[index].row, index);
    }
  });

  test('the line has no gaps: each cell touches the cell before it', () => {
    const ends = [[0, 0, 5, 13], [7, 2, 1, 9], [3, 11, 10, 0], [9, 9, 0, 4]];
    for (const [fromRow, fromColumn, toRow, toColumn] of ends) {
      const cells = lineCells(fromRow, fromColumn, toRow, toColumn);
      assert.deepEqual(cells[0], { row: fromRow, column: fromColumn });
      assert.deepEqual(cells[cells.length - 1], { row: toRow, column: toColumn });
      for (let index = 1; index < cells.length; index++) {
        const rowChange = Math.abs(cells[index].row - cells[index - 1].row);
        const columnChange = Math.abs(cells[index].column - cells[index - 1].column);
        assert.ok(rowChange <= 1, 'row change is 1 at most');
        assert.ok(columnChange <= 1, 'column change is 1 at most');
        assert.ok(rowChange + columnChange >= 1, 'the cell is not the same as the cell before');
      }
    }
  });

  test('a line with negative cells works', () => {
    assert.deepEqual(asText(lineCells(-1, -2, -1, 1)), ['-1,-2', '-1,-1', '-1,0', '-1,1']);
  });
});

describe('strokeCells', () => {
  test('a size 1 stroke is the same as the line', () => {
    assert.deepEqual(strokeCells(0, 0, 2, 6), lineCells(0, 0, 2, 6));
  });

  test('a stroke with no movement is the same as one stamp', () => {
    assert.deepEqual(strokeCells(5, 7, 5, 7, 3, 'round'), stampCells(5, 7, 3, 'round'));
  });

  test('a size 3 square stroke along a row covers 3 rows', () => {
    assert.deepEqual(asSortedText(strokeCells(5, 2, 5, 4, 3, 'square')), [
      '4,1', '4,2', '4,3', '4,4', '4,5',
      '5,1', '5,2', '5,3', '5,4', '5,5',
      '6,1', '6,2', '6,3', '6,4', '6,5',
    ]);
  });

  test('each cell is in the list one time only', () => {
    const texts = asText(strokeCells(0, 0, 6, 9, 4, 'round'));
    const uniqueTexts = new Set(texts);
    assert.equal(texts.length, uniqueTexts.size);
  });

  test('the stroke has each cell of each stamp on the line', () => {
    const stroke = new Set(asText(strokeCells(1, 1, 4, 8, 3, 'round')));
    for (const center of lineCells(1, 1, 4, 8)) {
      for (const text of asText(stampCells(center.row, center.column, 3, 'round'))) {
        assert.ok(stroke.has(text), text);
      }
    }
  });
});
