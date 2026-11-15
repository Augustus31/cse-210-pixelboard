/**
 * The "Recently used" row in the Colors card. It shows up to 5 color + alpha buttons, newest first.
 * @module recentColorsRow
 */
import { addRecentColor, loadRecentColors, saveRecentColors } from './recentColors.js';

function createRecentButton({ color, alpha }, onPick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'recent-color';
  button.style.setProperty('--color', color);
  button.style.setProperty('--alpha', String(alpha / 100));
  const label = `${color.toUpperCase()} · ${alpha}%`;
  button.title = label;
  button.setAttribute('aria-label', `Use recent color ${label}`);
  button.addEventListener('click', () => onPick(color, alpha));
  return button;
}

/**
 * Connects the row to storage and shows the saved colors.
 * @param {Object} options
 * @param {Storage|null} options.storage - Where the list is saved (null when storage is blocked)
 * @param {(color: string, alpha: number) => void} options.onPick - Called when the user clicks a recent color
 * @returns {{remember: (color: string, alpha: number) => void}} remember() adds a color after a pencil stroke
 */
export function createRecentColorsRow({ storage, onPick }) {
  const listElement = document.getElementById('recent-list');
  const emptyHint = document.getElementById('recent-empty');
  let recentColors = loadRecentColors(storage);

  function show() {
    listElement.replaceChildren(...recentColors.map((item) => createRecentButton(item, onPick)));
    emptyHint.hidden = recentColors.length > 0;
  }

  function remember(color, alpha) {
    recentColors = addRecentColor(recentColors, { color, alpha });
    saveRecentColors(storage, recentColors);
    show();
  }

  show();
  return { remember };
}
