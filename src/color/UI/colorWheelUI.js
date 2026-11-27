/**
 * A color wheel with an alpha bar, made with iro.js.
 * @module color/UI/colorWheelUI
 */
import iro from '@jaames/iro';
import { color, setColor, subscribe } from '../main.js';

/**
 * Makes a color wheel and an alpha bar inside a given container
 * @param {HTMLElement|string} container - The element (or a CSS selector) that holds the wheel
 * @param {Object} [options]
 * @param {number} [options.width=200] - The width of the wheel
 *   200 fits the color panel at all breakpoints in style.css.
 * @param {typeof iro.ColorPicker} [options.ColorPicker=iro.ColorPicker] - The picker class.
 *   Tests give a fake class here, because iro.js needs a browser.
 * @returns {{picker: iro.ColorPicker, destroy: () => void}}
 *   The iro.js picker, and a function that removes it
 */
export function createColorWheel(container, { width = 200, ColorPicker = iro.ColorPicker } = {}) {

  //make the wheel and the alpha bar
  const picker = new ColorPicker(container, {
    width,
    color,
    layout: [
      { component: iro.ui.Wheel },
      { component: iro.ui.Slider, options: { sliderType: 'alpha' } },
    ],
  });

  // change central color during user interaction
  function onColorChange(iroColor) {
    setColor(iroColor.hex8String);
  }
  picker.on('color:change', onColorChange);

  // change wheel color when central color changes
  function onCentralColorChange(newColor) {
    const wheelColor = picker.color.hex8String;
    if (wheelColor === newColor) return;
    picker.color.hex8String = newColor;
  }
  const unsubscribe = subscribe(onCentralColorChange);

  function destroy() {
    unsubscribe();
    picker.off('color:change', onColorChange);
    picker.el.remove();
  }

  return { picker, destroy };
}
