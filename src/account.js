/**
 * Pure helpers for the account (login) interface. They do not touch the DOM,
 * so they can be unit tested in Node.
 * @module account
 */

// A DID is long and hard to read, so the header shows only its start.
const SHORT_DID_LENGTH = 16;

/**
 * Removes spaces at the start and end, then one leading `@`.
 * People often copy a handle with its `@` (for example `@alice.bsky.social`).
 * @param {string} text - What the user typed
 * @returns {string} The cleaned handle
 */
export function cleanHandle(text) {
  return String(text).trim().replace(/^@/, '');
}

/**
 * Checks only what the UI can know: the handle is not empty and has no space inside.
 * The server does all other checks.
 * @param {string} text - What the user typed (it is cleaned first)
 * @returns {boolean} True when the handle can be sent to `signIn`
 */
export function isHandleUsable(text) {
  const handle = cleanHandle(text);
  return handle !== '' && !/\s/.test(handle);
}

/**
 * The name shown in the header for a logged-in user.
 * @param {{did: string, handle?: string}} user - The logged-in user
 * @returns {string} `@handle`, or the short DID when there is no handle
 */
export function accountLabel(user) {
  if (user.handle) return `@${user.handle}`;
  if (user.did.length <= SHORT_DID_LENGTH) return user.did;
  return `${user.did.slice(0, SHORT_DID_LENGTH)}…`;
}
