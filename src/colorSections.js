/**
 * Remembers which parts of the Colors card are open or closed.
 * The storage object is a parameter, so tests can pass a fake one.
 * @module colorSections
 */

export const SECTION_STORAGE_KEY = 'pixelboard-color-sections-v1';

/** New users see the color wheel only; the many sliders stay hidden until asked for. */
export const DEFAULT_SECTION_STATE = Object.freeze({ wheel: true, advanced: false, swatches: false });

/**
 * Reads the saved open/closed state. Falls back to the defaults for anything missing or broken.
 * @param {Storage|null} storage - For example window.localStorage, or null when it is not available
 * @returns {{wheel: boolean, advanced: boolean, swatches: boolean}}
 */
export function loadSectionState(storage) {
  const state = { ...DEFAULT_SECTION_STATE };
  try {
    const saved = JSON.parse(storage.getItem(SECTION_STORAGE_KEY));
    for (const name of Object.keys(state)) {
      if (typeof saved?.[name] === 'boolean') state[name] = saved[name];
    }
  } catch { /* Storage is blocked or the saved text is broken: keep the defaults. */ }
  return state;
}

/**
 * Saves the open/closed state.
 * @param {Storage|null} storage
 * @param {{wheel: boolean, advanced: boolean, swatches: boolean}} state
 * @returns {boolean} true when the state was saved
 */
export function saveSectionState(storage, state) {
  try {
    storage.setItem(SECTION_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
