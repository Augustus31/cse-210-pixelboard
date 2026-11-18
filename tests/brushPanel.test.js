import test from 'node:test';
import assert from 'node:assert/strict';
import { createBrushPanel } from '../src/brushPanel.js';

test('brush popup stays inside its toolbar when opened and resized', (t) => {
  class Element extends EventTarget {
    style = {};
    hidden = true;
    attributes = {};
    setAttribute(name, value) { this.attributes[name] = value; }
    querySelectorAll() { return []; }
  }
  const elements = new Map();
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  const document = new Element();
  document.getElementById = get;
  const toolbar = new Element();
  toolbar.clientWidth = 300;
  toolbar.getBoundingClientRect = () => ({ left: 20 });
  const panel = get('brush-panel');
  panel.offsetParent = panel.parentElement = toolbar;
  panel.offsetWidth = 220;
  const button = new Element();
  let buttonLeft = 240;
  button.getBoundingClientRect = () => ({ left: buttonLeft });
  let resize;
  for (const [name, value] of Object.entries({ document, ResizeObserver: class {
    constructor(callback) { resize = callback; }
    observe(target) { assert.equal(target, toolbar); }
  } })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { value, configurable: true });
    t.after(() => previous ? Object.defineProperty(globalThis, name, previous) : delete globalThis[name]);
  }
  const controller = createBrushPanel({
    settingsByTool: { pencil: { size: 10, shape: 'square' }, eraser: { size: 1, shape: 'square' } },
    getCanvasSize: () => 40,
  });
  controller.open('pencil', button);
  assert.equal(panel.style.left, '80px', 'clamp at the right edge');
  assert.equal(get('brush-size-number').value, '10');
  assert.equal(get('brush-size-range').max, '10', 'brush limits stay unchanged');
  buttonLeft = 35;
  resize();
  assert.equal(panel.style.left, '15px', 'align with the button when there is room');
  toolbar.clientWidth = panel.offsetWidth = 180;
  resize();
  assert.equal(panel.style.left, '0px', 'fit a toolbar narrower than the normal popup');
  controller.close();
  assert.equal(panel.hidden, true);
  resize();
  assert.equal(controller.openTool(), null);
});
