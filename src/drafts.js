/**
 * Drafts API (Spec 1, section 4.5.2).
 *
 * This is the contract between the drafts column (our group) and the save/export group.
 * Today the drafts live in the browser's localStorage. Later the save/export group replaces
 * the inside of this file with PDS (AT Protocol) storage. The three exported API functions
 * (saveDraft, listDrafts, loadDraft) must keep their names, inputs, and results, so the UI
 * code does not need changes. They are async because a PDS version will use the network.
 *
 * On failure, each function rejects with an Error that has a readable `message`; the UI shows it.
 * @module drafts
 */

/**
 * @typedef {Object} Draft
 * @property {string}   id       Unique id, created by the storage layer.
 * @property {number}   size     Canvas width and height in cells (25, 40, or 64).
 * @property {string[]} pixels   size*size colors, each '#rrggbb', row by row.
 * @property {string}   savedAt  ISO 8601 time, for example '2026-11-15T10:30:00.000Z'.
 */

/** Separate from the teammate's auto-save key ('pixelboard-v1'), so drafts never touch it. */
export const DRAFTS_KEY = 'pixelboard-drafts-v1';

const CANVAS_SIZES = [25, 40, 64];
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function hasValidPixels(size, pixels) {
  return Array.isArray(pixels) && pixels.length === size * size && pixels.every((color) => typeof color === 'string' && HEX_COLOR.test(color));
}

function isValidDraft(draft) {
  return typeof draft?.id === 'string' && CANVAS_SIZES.includes(draft.size)
    && hasValidPixels(draft.size, draft.pixels) && typeof draft.savedAt === 'string';
}

// crypto.randomUUID only exists on secure pages (https or localhost), so keep a fallback.
function createRandomId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isStorageFullError(error) {
  return error?.name === 'QuotaExceededError' || error?.name === 'NS_ERROR_DOM_QUOTA_REACHED';
}

/**
 * Creates the localStorage version of the drafts API. The parts are parameters, so tests can use fakes.
 * @param {Object} options
 * @param {Storage|null} options.storage - Where drafts are kept (null when the browser blocks storage)
 * @param {() => Date} [options.now] - Gives the current time
 * @param {() => string} [options.createId] - Gives a new unique id
 * @returns {{saveDraft: Function, listDrafts: Function, loadDraft: Function}}
 */
export function createDraftStore({ storage, now = () => new Date(), createId = createRandomId }) {
  function requireStorage() {
    if (!storage) throw new Error('Browser storage is not available, so drafts cannot be saved or opened here.');
    return storage;
  }

  function readStoredText() {
    const drafts = requireStorage();
    try {
      return drafts.getItem(DRAFTS_KEY);
    } catch (error) {
      throw new Error(`Could not read the drafts: ${error.message}`);
    }
  }

  // Each read parses the stored text again, so callers always get their own copies.
  // Broken items are skipped, so one bad item does not hide the other drafts.
  function readAll() {
    let saved;
    try {
      saved = JSON.parse(readStoredText() ?? '[]');
    } catch (error) {
      if (error instanceof SyntaxError) return []; // Text that is not JSON cannot be repaired.
      throw error;
    }
    return Array.isArray(saved) ? saved.filter(isValidDraft) : [];
  }

  function writeAll(drafts) {
    try {
      requireStorage().setItem(DRAFTS_KEY, JSON.stringify(drafts));
    } catch (error) {
      if (isStorageFullError(error)) throw new Error('Could not save the draft: browser storage is full. Download your drawing as a PNG to keep it.');
      throw new Error(`Could not save the draft: ${error.message}`);
    }
  }

  /**
   * Saves a copy of the drawing.
   * @param {{size: number, pixels: string[]}} canvas
   * @returns {Promise<Draft>} The new draft
   */
  async function saveDraft({ size, pixels }) {
    if (!CANVAS_SIZES.includes(size)) throw new Error(`Draft size must be 25, 40, or 64 (got ${size}).`);
    if (!hasValidPixels(size, pixels)) throw new Error('Draft pixels must be size × size colors in #rrggbb form.');
    const draft = { id: createId(), size, pixels: pixels.slice(), savedAt: now().toISOString() };
    writeAll([draft, ...readAll()]);
    return { ...draft, pixels: draft.pixels.slice() };
  }

  /**
   * @returns {Promise<Draft[]>} All drafts, newest first
   */
  async function listDrafts() {
    // sort() keeps the stored order for equal times, and new drafts are stored first.
    return readAll().sort((first, second) => Date.parse(second.savedAt) - Date.parse(first.savedAt));
  }

  /**
   * @param {string} id
   * @returns {Promise<Draft|null>} The draft with this id, or null if it does not exist
   */
  async function loadDraft(id) {
    return readAll().find((draft) => draft.id === id) ?? null;
  }

  return { saveDraft, listDrafts, loadDraft };
}

function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // Some privacy settings block storage access completely.
  }
}

// Created on first use, so importing this file never touches storage.
let browserDraftStore = null;
function defaultStore() {
  browserDraftStore ??= createDraftStore({ storage: browserStorage() });
  return browserDraftStore;
}

/**
 * Saves a copy of the drawing. Resolves to the new Draft.
 * @param {{size: number, pixels: string[]}} canvas
 * @returns {Promise<Draft>}
 */
export async function saveDraft({ size, pixels }) {
  return defaultStore().saveDraft({ size, pixels });
}

/**
 * Resolves to all drafts, newest first.
 * @returns {Promise<Draft[]>}
 */
export async function listDrafts() {
  return defaultStore().listDrafts();
}

/**
 * Resolves to the Draft with this id, or null if it does not exist.
 * @param {string} id
 * @returns {Promise<Draft|null>}
 */
export async function loadDraft(id) {
  return defaultStore().loadDraft(id);
}
