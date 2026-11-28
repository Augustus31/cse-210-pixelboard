import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  tool,
  strokeSize,
  strokeShape,
  TOOL_NAMES,
  setTool,
  setStrokeSize,
  setStrokeShape,
  subscribe,
} from '../src/canvas/tools/main.js';

// The tool state is shared module state, so each test starts from a known state.
function resetTools() {
  setTool('pencil');
  setStrokeSize(1);
  setStrokeShape('square');
}

/** Counts the subscriber calls and keeps the last state. */
function makeListener() {
  const record = { callCount: 0, lastState: null };
  record.unsubscribe = subscribe((state) => {
    record.callCount = record.callCount + 1;
    record.lastState = state;
  });
  return record;
}

describe('start state', () => {
  test('the tool is the pencil, with a size 1 square stroke', () => {
    assert.equal(tool, 'pencil');
    assert.equal(strokeSize, 1);
    assert.equal(strokeShape, 'square');
  });

  test('the tools are pencil, eraser, eyedropper, and fill', () => {
    assert.deepEqual(TOOL_NAMES, ['pencil', 'eraser', 'eyedropper', 'fill']);
  });
});

describe('setTool', () => {
  test('changes the tool to each valid name', () => {
    for (const name of TOOL_NAMES) {
      resetTools();
      assert.equal(setTool(name), true);
      assert.equal(tool, name);
    }
  });

  test('a name that is not a tool is ignored', () => {
    for (const name of ['brush', 'Pencil', '', null, undefined, 3]) {
      resetTools();
      assert.equal(setTool(name), false, String(name));
      assert.equal(tool, 'pencil');
    }
  });
});

describe('setStrokeSize', () => {
  test('changes the stroke size', () => {
    resetTools();
    assert.equal(setStrokeSize(5), true);
    assert.equal(strokeSize, 5);
  });

  test('a size that is not a whole number above 0 is ignored', () => {
    for (const size of [0, -1, 1.5, NaN, Infinity, '3', null, undefined]) {
      resetTools();
      assert.equal(setStrokeSize(size), false, String(size));
      assert.equal(strokeSize, 1);
    }
  });
});

describe('setStrokeShape', () => {
  test('changes the stroke shape', () => {
    resetTools();
    assert.equal(setStrokeShape('round'), true);
    assert.equal(strokeShape, 'round');
  });

  test('a shape that is not valid is ignored', () => {
    for (const shape of ['circle', 'Round', '', null, undefined]) {
      resetTools();
      assert.equal(setStrokeShape(shape), false, String(shape));
      assert.equal(strokeShape, 'square');
    }
  });
});

describe('subscribe', () => {
  test('each change calls the listener with the full tool state', () => {
    resetTools();
    const record = makeListener();
    setTool('eraser');
    assert.deepEqual(record.lastState, { tool: 'eraser', strokeSize: 1, strokeShape: 'square' });
    setStrokeSize(4);
    assert.deepEqual(record.lastState, { tool: 'eraser', strokeSize: 4, strokeShape: 'square' });
    setStrokeShape('round');
    assert.deepEqual(record.lastState, { tool: 'eraser', strokeSize: 4, strokeShape: 'round' });
    assert.equal(record.callCount, 3);
    record.unsubscribe();
  });

  test('the same value does not call the listener', () => {
    resetTools();
    const record = makeListener();
    assert.equal(setTool('pencil'), true);
    assert.equal(setStrokeSize(1), true);
    assert.equal(setStrokeShape('square'), true);
    assert.equal(record.callCount, 0);
    record.unsubscribe();
  });

  test('a value that is not valid does not call the listener', () => {
    resetTools();
    const record = makeListener();
    setTool('brush');
    setStrokeSize(0);
    setStrokeShape('circle');
    assert.equal(record.callCount, 0);
    record.unsubscribe();
  });

  test('the function from subscribe stops the calls', () => {
    resetTools();
    const record = makeListener();
    record.unsubscribe();
    setTool('fill');
    assert.equal(record.callCount, 0);
  });
});
