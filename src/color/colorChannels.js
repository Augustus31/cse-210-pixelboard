/**
 * The "Advanced" part of the color picker: a slider and a number input for H, S, V, R, G, B, A (alpha), and a hex input.
 * @module colorChannels
 */
import { hsvToRgb, rgbToHex, hexToRgb, rgbToHsv, withChannel } from './color.js';
import { parseNumberInput } from './numberInput.js';

const CHANNELS = [
  { key: 'h', label: 'H', name: 'Hue', max: 360 },
  { key: 's', label: 'S', name: 'Saturation', max: 100 },
  { key: 'v', label: 'V', name: 'Value (brightness)', max: 100 },
  { key: 'r', label: 'R', name: 'Red', max: 255 },
  { key: 'g', label: 'G', name: 'Green', max: 255 },
  { key: 'b', label: 'B', name: 'Blue', max: 255 },
  { key: 'a', label: 'A', name: 'Alpha (opacity)', max: 100 },
];

function createChannelRow({ key, label, name, max }) {
  const row = document.createElement('div');
  row.className = 'channel-row';
  row.innerHTML = `<label for="channel-${key}-range" title="${name}">${label}</label>`
    + `<input type="range" id="channel-${key}-range" min="0" max="${max}" step="1" aria-label="${name}" />`
    + `<input type="number" id="channel-${key}-number" min="0" max="${max}" step="1" aria-label="${name} value" />`;
  return row;
}

/**
 * Builds the channel rows and connects them and the hex input.
 * @param {Object} options
 * @param {(hsv: {h: number, s: number, v: number}) => void} options.onUserInput - Called with the new color when the user changes a control
 * @returns {{show: (hsv: {h: number, s: number, v: number}) => void}} show() puts a color into every control
 */
export function createColorChannels({ onUserInput }) {
  const list = document.getElementById('channel-list');
  const hexInput = document.getElementById('hex-input');
  let shownHsv = { h: 0, s: 0, v: 0 };

  function shownValue(key) {
    const value = key in shownHsv ? shownHsv[key] : hsvToRgb(shownHsv)[key];
    return Math.round(value);
  }

  for (const channel of CHANNELS) {
    list.append(createChannelRow(channel));
    const slider = document.getElementById(`channel-${channel.key}-range`);
    const number = document.getElementById(`channel-${channel.key}-number`);
    slider.addEventListener('input', () => onUserInput(withChannel(shownHsv, channel.key, Number(slider.value))));
    // The number waits for Enter or blur, so a half-typed value is not used yet.
    number.addEventListener('change', () => {
      const value = parseNumberInput(number.value, 0, channel.max, shownValue(channel.key));
      onUserInput(withChannel(shownHsv, channel.key, value));
    });
  }
  hexInput.addEventListener('change', () => {
    const rgb = hexToRgb(hexInput.value);
    // Invalid text: show the last valid hex again.
    onUserInput(rgb ? { ...rgbToHsv(rgb, shownHsv.h), a: shownHsv.a } : shownHsv);
  });

  function show(hsv) {
    shownHsv = hsv;
    for (const { key } of CHANNELS) {
      const value = String(shownValue(key));
      document.getElementById(`channel-${key}-range`).value = value;
      document.getElementById(`channel-${key}-number`).value = value;
    }
    hexInput.value = rgbToHex(hsvToRgb(hsv));
  }

  return { show };
}
