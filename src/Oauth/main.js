/**
 * homescript for the Oauth module, moving all exports to a single file for easier imports.
 *
 * The real login module (`oauthClient.js`) loads its OAuth client from a URL,
 * which only a browser can do. This file loads it with a dynamic import on first use,
 * so this file stays loadable in Node for the unit tests.
 * @module Oauth/main
 */

/**
 * Loads the login module. Later calls get the same module from the browser cache.
 * @returns {Promise<Object>} The login module
 */
function loadAuthModule() {
  return import('./oauthClient.js');
}

/**
 * Call one time at page load. Finishes a login in progress, or restores the last session.
 * @returns {Promise<{did: string, handle?: string}|null>} The logged-in user, or null
 */
export async function initAuth() {
  const auth = await loadAuthModule();
  return auth.initAuth();
}

/**
 * Sends the browser to the user's sign-in page.
 * @param {string} handle - The user's handle, for example 'you.bsky.social'
 * @returns {Promise<void>}
 */
export async function signIn(handle) {
  const auth = await loadAuthModule();
  return auth.signIn(handle);
}

/**
 * Ends the session.
 * @returns {Promise<void>}
 */
export async function signOut() {
  const auth = await loadAuthModule();
  return auth.signOut();
}

/**
 * Gets the DID of the logged-in user.
 * @returns {Promise<string|null>} The DID, or null when no user is logged in
 */
export async function currentDid() {
  const auth = await loadAuthModule();
  return auth.currentDid();
}

/**
 * Sends a request to the user's PDS as the logged-in user.
 * @param {string} path - The path of the request on the PDS
 * @param {RequestInit} [init] - The same options as `fetch`
 * @returns {Promise<Response>} The response from the PDS
 */
export async function authFetch(path, init) {
  const auth = await loadAuthModule();
  return auth.authFetch(path, init);
}

export { createAccountMenu } from './UI/accountMenuUI.js';
export { cleanHandle, isHandleUsable, accountLabel } from './account.js';
