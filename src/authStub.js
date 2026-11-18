/**
 * STAND-IN LOGIN MODULE. THIS IS NOT A REAL LOGIN.
 *
 * It has the same functions as the OAuth teammate's `auth.js` (branch `oauth`):
 * `initAuth`, `signIn`, `signOut`, and the window event `auth-ended`.
 * It uses no network, never leaves the page, and keeps the session in memory only,
 * so a page reload logs the user out.
 *
 * Replace it with the real module: in `src/pixelEditor.js`, change the import
 * from `./authStub.js` to `./auth.js` after branch merge.
 *
 * Extra behavior that the real module does not have:
 * - `signIn` resolves, and fires the window event `auth-changed` with the user in
 *   `event.detail`. The real module leaves the page, and `initAuth()` gives the user
 *   after the browser comes back.
 * - The handle `fail.test` always fails, so the error path can be checked.
 * @module authStub
 */
import { cleanHandle } from './account.js';

/** @typedef {{did: string, handle?: string}} AuthUser */

const FAILING_TEST_HANDLE = 'fail.test';
// Long enough for the user to see the "busy" state, short enough not to annoy.
const FAKE_SIGN_IN_DELAY_MS = 300;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Creates one stand-in session. Tests give their own event target and delay.
 * @param {Object} [options]
 * @param {EventTarget} [options.eventTarget] - Receives the `auth-changed` event (the browser `window` by default)
 * @param {number} [options.delayMs] - Fake wait in `signIn`
 * @returns {{initAuth: () => Promise<AuthUser|null>, signIn: (handle: string) => Promise<void>, signOut: () => Promise<void>, getUser: () => AuthUser|null}}
 */
export function createAuthStub({ eventTarget = globalThis.window, delayMs = FAKE_SIGN_IN_DELAY_MS } = {}) {
  /** @type {AuthUser|null} */
  let user = null;
  /** @type {Promise<AuthUser|null>|null} */
  let initPromise = null;

  // Copies stop callers from changing the stored session by accident.
  const copyOfUser = () => (user ? { ...user } : null);

  function initAuth() {
    initPromise ??= Promise.resolve(copyOfUser());
    return initPromise;
  }

  async function signIn(handle) {
    // The real module throws here too, so a UI bug shows up with the stand-in.
    if (!initPromise) throw new Error('Call initAuth() before signIn().');
    const cleanedHandle = cleanHandle(handle);
    await wait(delayMs);
    if (cleanedHandle === FAILING_TEST_HANDLE) {
      throw new Error(`The test handle ${FAILING_TEST_HANDLE} always fails.`);
    }
    user = { did: `did:example:${cleanedHandle}`, handle: cleanedHandle };
    eventTarget?.dispatchEvent(new CustomEvent('auth-changed', { detail: copyOfUser() }));
  }

  async function signOut() {
    user = null;
  }

  return { initAuth, signIn, signOut, getUser: copyOfUser };
}

// The default session is made on first use, so importing this file in Node does not need `window`.
let defaultStub = null;
const getDefaultStub = () => (defaultStub ??= createAuthStub());

/** Call one time at page load. Resolves to the logged-in user, or null. Later calls give the same Promise. */
export const initAuth = () => getDefaultStub().initAuth();

/** Starts a fake login for this handle (see the note at the top of this file). */
export const signIn = (handle) => getDefaultStub().signIn(handle);

/** Ends the fake session. */
export const signOut = () => getDefaultStub().signOut();
