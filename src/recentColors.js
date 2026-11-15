/**
 * The "Recently used" colors: the last 5 color + alpha pairs that the pencil drew with.
 * Every function is pure or takes the storage as a parameter, so tests can use a fake storage.
 * @module recentColors
 */

export const RECENT_COLORS_KEY = 'pixelboard-recent-colors-v1';
export const MAX_RECENT_COLORS = 5;

/**
 * @typedef {Object} RecentColor
 * @property {string} color - '#rrggbb', lowercase
 * @property {number} alpha - Opacity, 0–100
 */

const isSameItem = (first, second) => first.color === second.color && first.alpha === second.alpha;

function isValidItem(item) {
  return typeof item?.color === 'string' && /^#[0-9a-f]{6}$/i.test(item.color)
    && Number.isFinite(item.alpha) && item.alpha >= 0 && item.alpha <= 100;
}

/**
 * Returns a new list with the item at the front. An equal item moves to the front instead of
 * showing twice, and the oldest item drops off when the list is longer than 5.
 * @param {RecentColor[]} list - The current list, newest first. It is not changed.
 * @param {RecentColor} item - The color and alpha that the pencil just drew with
 * @returns {RecentColor[]}
 */
export function addRecentColor(list, item) {
  const newItem = { color: item.color.toLowerCase(), alpha: item.alpha };
  const others = list.filter((existing) => !isSameItem(existing, newItem));
  return [newItem, ...others].slice(0, MAX_RECENT_COLORS);
}

/**
 * Reads the saved list. Broken items are skipped; missing or broken data gives an empty list.
 * @param {Storage|null} storage
 * @returns {RecentColor[]}
 */
export function loadRecentColors(storage) {
  try {
    const saved = JSON.parse(storage.getItem(RECENT_COLORS_KEY));
    if (!Array.isArray(saved)) return [];
    return saved.filter(isValidItem)
      .map((item) => ({ color: item.color.toLowerCase(), alpha: item.alpha }))
      .slice(0, MAX_RECENT_COLORS);
  } catch {
    return [];
  }
}

/**
 * Saves the list.
 * @param {Storage|null} storage
 * @param {RecentColor[]} list
 * @returns {boolean} true when the list was saved
 */
export function saveRecentColors(storage, list) {
  try {
    storage.setItem(RECENT_COLORS_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}
