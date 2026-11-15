/**
 * Pure helpers for showing drafts in the drafts column.
 * @module draftDisplay
 */

/**
 * Turns draft pixels into the RGBA bytes that ImageData needs, so a thumbnail can be drawn
 * from the data itself (no image files are stored).
 * @param {string[]} pixels - '#rrggbb' colors, row by row
 * @returns {Uint8ClampedArray} 4 bytes (R, G, B, A) per cell
 */
export function pixelsToRgba(pixels) {
  const bytes = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach((color, index) => {
    bytes[index * 4] = parseInt(color.slice(1, 3), 16);
    bytes[index * 4 + 1] = parseInt(color.slice(3, 5), 16);
    bytes[index * 4 + 2] = parseInt(color.slice(5, 7), 16);
    bytes[index * 4 + 3] = 255;
  });
  return bytes;
}

/**
 * Formats a save time for the draft list, for example "Nov 15, 10:30 AM".
 * @param {string} isoTime - ISO 8601 time
 * @param {string} [timeZone] - Time zone name; leave it out to use the user's time zone
 * @returns {string}
 */
export function formatSavedAt(isoTime, timeZone) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone })
    .format(new Date(isoTime));
}

/**
 * Two-step load: the first click highlights a draft; a click on the highlighted draft asks to load it.
 * @param {string|null} selectedId - The highlighted draft before the click
 * @param {string} clickedId - The draft that was clicked
 * @returns {{selectedId: string, askToLoad: boolean}}
 */
export function nextDraftSelection(selectedId, clickedId) {
  return { selectedId: clickedId, askToLoad: selectedId === clickedId };
}
