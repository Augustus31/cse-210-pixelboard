/**
 * Turns the text of a number input into a valid whole number.
 * @param {string} text - What the user typed
 * @param {number} min - Smallest valid value
 * @param {number} max - Largest valid value
 * @param {number} lastValid - Value to keep when the text is not a number
 * @returns {number} A whole number from min to max
 */
export function parseNumberInput(text, min, max, lastValid) {
  if (String(text).trim() === '') return lastValid;
  const number = Number(text);
  if (!Number.isFinite(number)) return lastValid;
  return Math.min(max, Math.max(min, Math.round(number)));
}
