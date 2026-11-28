import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setGridSize, setCell, getCell, EMPTY_CELL } from '../src/canvas/main.js';
import {
  tool, strokeSize, strokeShape, setTool, setStrokeSize, setStrokeShape,
} from '../src/canvas/tools/main.js';
import { beginStep, endStep, clearHistory } from '../src/canvas/history.js';
import { createToolbar } from '../src/canvas/UI/toolbarUI.js';
import { createStrokePanel } from '../src/canvas/UI/strokePanelUI.js';
import { createHistoryButtons } from '../src/canvas/UI/historyButtonsUI.js';
import { createShortcuts } from '../src/canvas/UI/shortcutsUI.js';

const RED = '#ff0000ff';

/** A stand-in for a DOM element. Node has no DOM, so the tests use this. */
class FakeElement extends EventTarget {
  constructor() {
    super();
    this.children = [];
    this.attributes = {};
    this.dataset = {};
    this.parent = null;
    this.disabled = false;
    this.value = '';
    this.classNames = new Set();
    this.classList = {
      toggle: (name, isOn) => {
        if (isOn) {
          this.classNames.add(name);
        } else {
          this.classNames.delete(name);
        }
      },
    };
  }

  append(child) {
    this.children.push(child);
    child.parent = this;
  }

  remove() {
    if (this.parent === null) return;
    this.parent.children = this.parent.children.filter((child) => child !== this);
    this.parent = null;
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  click() {
    if (this.disabled) return;
    this.dispatchEvent(new Event('click'));
  }
}

const container = new FakeElement();

before(() => {
  globalThis.document = {
    createElement: () => new FakeElement(),
    querySelector: (selector) => {
      if (selector === '#controls') return container;
      return null;
    },
  };
});

after(() => {
  delete globalThis.document;
});

/** Each test starts from a known grid, tool state, and history. */
function reset() {
  setGridSize(4, 4);
  clearHistory();
  setTool('pencil');
  setStrokeSize(1);
  setStrokeShape('square');
  container.children = [];
}

/** Gives the text of a button: its own text, or the text of its label. */
function buttonText(button) {
  if (button.textContent !== undefined) return button.textContent;
  for (const part of button.children) {
    if (part.textContent !== undefined) return part.textContent;
  }
  return null;
}

/** Finds the child button with the given text. */
function buttonWithText(element, text) {
  for (const child of element.children) {
    if (buttonText(child) === text) return child;
  }
  return null;
}

/** Does one undo step that paints one cell. */
function paintStep(row, column) {
  beginStep();
  setCell(row, column, RED);
  endStep();
}

/** Sends a keydown event to a target. */
function pressKey(target, key, options = {}) {
  const event = new Event('keydown', { cancelable: true });
  event.key = key;
  event.ctrlKey = options.ctrlKey === true;
  event.metaKey = options.metaKey === true;
  event.shiftKey = options.shiftKey === true;
  event.altKey = options.altKey === true;
  if (options.tagName !== undefined) {
    Object.defineProperty(event, 'target', { value: { tagName: options.tagName } });
  }
  target.dispatchEvent(event);
  return event;
}

describe('createToolbar', () => {
  test('makes one button for each tool, in the container', () => {
    reset();
    const { element, destroy } = createToolbar('#controls');
    assert.deepEqual(container.children, [element]);
    const texts = element.children.map((button) => buttonText(button));
    assert.deepEqual(texts, ['Pencil', 'Eraser', 'Eyedropper', 'Fill']);
    destroy();
  });

  test('each button has an icon before its name', () => {
    reset();
    const { element, destroy } = createToolbar(container);
    for (const button of element.children) {
      const icon = button.children[0];
      assert.equal(icon.className, 'canvas-tool-icon');
      assert.match(icon.innerHTML, /^<svg /);
    }
    destroy();
  });

  test('the button of the active tool is pressed', () => {
    reset();
    const { element, destroy } = createToolbar(container);
    assert.equal(buttonWithText(element, 'Pencil').attributes['aria-pressed'], 'true');
    assert.equal(buttonWithText(element, 'Fill').attributes['aria-pressed'], 'false');
    destroy();
  });

  test('a click makes that tool the active tool', () => {
    reset();
    const { element, destroy } = createToolbar(container);
    buttonWithText(element, 'Fill').click();
    assert.equal(tool, 'fill');
    assert.equal(buttonWithText(element, 'Fill').attributes['aria-pressed'], 'true');
    assert.equal(buttonWithText(element, 'Pencil').attributes['aria-pressed'], 'false');
    destroy();
  });

  test('a tool change from other code changes the pressed button', () => {
    reset();
    const { element, destroy } = createToolbar(container);
    setTool('eraser');
    assert.equal(buttonWithText(element, 'Eraser').attributes['aria-pressed'], 'true');
    assert.equal(buttonWithText(element, 'Eraser').classNames.has('active'), true);
    destroy();
  });

  test('destroy removes the row and stops the updates', () => {
    reset();
    const { element, destroy } = createToolbar(container);
    destroy();
    assert.deepEqual(container.children, []);
    setTool('eraser');
    assert.equal(buttonWithText(element, 'Eraser').attributes['aria-pressed'], 'false');
  });
});

describe('createStrokePanel', () => {
  test('shows the stroke size and the stroke shape', () => {
    reset();
    setStrokeSize(3);
    setStrokeShape('round');
    const { element, destroy } = createStrokePanel(container);
    assert.equal(element.children[0].value, '3');
    assert.equal(element.children[1].value, '3');
    assert.equal(buttonWithText(element, 'Round').attributes['aria-pressed'], 'true');
    assert.equal(buttonWithText(element, 'Square').attributes['aria-pressed'], 'false');
    destroy();
  });

  test('the slider changes the stroke size and the number input', () => {
    reset();
    const { element, destroy } = createStrokePanel(container);
    const sizeSlider = element.children[0];
    assert.equal(sizeSlider.type, 'range');
    sizeSlider.value = '6';
    sizeSlider.dispatchEvent(new Event('input'));
    assert.equal(strokeSize, 6);
    assert.equal(element.children[1].value, '6');
    destroy();
  });

  test('a typed size changes the stroke size and the slider', () => {
    reset();
    const { element, destroy } = createStrokePanel(container);
    const sizeInput = element.children[1];
    sizeInput.value = '5';
    sizeInput.dispatchEvent(new Event('change'));
    assert.equal(strokeSize, 5);
    assert.equal(element.children[0].value, '5');
    destroy();
  });

  test('a size out of range changes to the nearest valid size', () => {
    reset();
    const { element, destroy } = createStrokePanel(container, { maxSize: 8 });
    const sizeInput = element.children[1];
    sizeInput.value = '50';
    sizeInput.dispatchEvent(new Event('change'));
    assert.equal(strokeSize, 8);
    assert.equal(sizeInput.value, '8');
    sizeInput.value = '0';
    sizeInput.dispatchEvent(new Event('change'));
    assert.equal(strokeSize, 1);
    assert.equal(sizeInput.value, '1');
    destroy();
  });

  test('text that is not a number changes back to the current size', () => {
    reset();
    setStrokeSize(4);
    const { element, destroy } = createStrokePanel(container);
    const sizeInput = element.children[1];
    sizeInput.value = 'abc';
    sizeInput.dispatchEvent(new Event('change'));
    assert.equal(strokeSize, 4);
    assert.equal(sizeInput.value, '4');
    destroy();
  });

  test('a click on a shape button changes the stroke shape', () => {
    reset();
    const { element, destroy } = createStrokePanel(container);
    buttonWithText(element, 'Round').click();
    assert.equal(strokeShape, 'round');
    assert.equal(buttonWithText(element, 'Round').attributes['aria-pressed'], 'true');
    destroy();
  });

  test('a change from other code shows in the controls', () => {
    reset();
    const { element, destroy } = createStrokePanel(container);
    setStrokeSize(7);
    assert.equal(element.children[0].value, '7');
    assert.equal(element.children[1].value, '7');
    destroy();
  });
});

describe('createHistoryButtons', () => {
  test('Undo and Redo start disabled when there are no steps', () => {
    reset();
    const { element, destroy } = createHistoryButtons(container);
    assert.equal(buttonWithText(element, 'Undo').disabled, true);
    assert.equal(buttonWithText(element, 'Redo').disabled, true);
    destroy();
  });

  test('Undo is enabled after a step, and a click undoes the step', () => {
    reset();
    const { element, destroy } = createHistoryButtons(container);
    paintStep(0, 0);
    assert.equal(buttonWithText(element, 'Undo').disabled, false);
    buttonWithText(element, 'Undo').click();
    assert.equal(getCell(0, 0), EMPTY_CELL);
    assert.equal(buttonWithText(element, 'Undo').disabled, true);
    assert.equal(buttonWithText(element, 'Redo').disabled, false);
    destroy();
  });

  test('a click on Redo does the step again', () => {
    reset();
    const { element, destroy } = createHistoryButtons(container);
    paintStep(0, 0);
    buttonWithText(element, 'Undo').click();
    buttonWithText(element, 'Redo').click();
    assert.equal(getCell(0, 0), RED);
    destroy();
  });

  test('Erase all makes all cells empty, as one undo step', () => {
    reset();
    const { element, destroy } = createHistoryButtons(container);
    paintStep(0, 0);
    paintStep(1, 1);
    buttonWithText(element, 'Erase all').click();
    assert.equal(getCell(0, 0), EMPTY_CELL);
    assert.equal(getCell(1, 1), EMPTY_CELL);
    buttonWithText(element, 'Undo').click();
    assert.equal(getCell(0, 0), RED);
    assert.equal(getCell(1, 1), RED);
    destroy();
  });
});

describe('createShortcuts', () => {
  test('P, E, I, and F change the tool', () => {
    reset();
    const target = new EventTarget();
    const { destroy } = createShortcuts(target);
    pressKey(target, 'e');
    assert.equal(tool, 'eraser');
    pressKey(target, 'i');
    assert.equal(tool, 'eyedropper');
    pressKey(target, 'F');
    assert.equal(tool, 'fill');
    pressKey(target, 'p');
    assert.equal(tool, 'pencil');
    destroy();
  });

  test('Ctrl+Z is undo, and Ctrl+Shift+Z and Ctrl+Y are redo', () => {
    reset();
    const target = new EventTarget();
    const { destroy } = createShortcuts(target);
    paintStep(0, 0);
    const undoEvent = pressKey(target, 'z', { ctrlKey: true });
    assert.equal(getCell(0, 0), EMPTY_CELL);
    assert.equal(undoEvent.defaultPrevented, true);
    pressKey(target, 'Z', { ctrlKey: true, shiftKey: true });
    assert.equal(getCell(0, 0), RED);
    pressKey(target, 'z', { metaKey: true });
    assert.equal(getCell(0, 0), EMPTY_CELL);
    pressKey(target, 'y', { ctrlKey: true });
    assert.equal(getCell(0, 0), RED);
    destroy();
  });

  test('a key press in an input is ignored', () => {
    reset();
    const target = new EventTarget();
    const { destroy } = createShortcuts(target);
    pressKey(target, 'e', { tagName: 'INPUT' });
    assert.equal(tool, 'pencil');
    destroy();
  });

  test('a tool key with Ctrl or Alt is ignored', () => {
    reset();
    const target = new EventTarget();
    const { destroy } = createShortcuts(target);
    pressKey(target, 'e', { ctrlKey: true });
    pressKey(target, 'f', { altKey: true });
    assert.equal(tool, 'pencil');
    destroy();
  });

  test('after destroy, the keys do nothing', () => {
    reset();
    const target = new EventTarget();
    const { destroy } = createShortcuts(target);
    destroy();
    pressKey(target, 'e');
    assert.equal(tool, 'pencil');
  });
});
