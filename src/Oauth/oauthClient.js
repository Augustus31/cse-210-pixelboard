/**
 * The real AT Protocol OAuth session. It loads its OAuth client from a URL,
 * so only a browser can import this file. The app gets it through `main.js`.
 * @module Oauth/oauthClient
 */

import { BrowserOAuthClient } from 'https://esm.sh/@atproto/oauth-client-browser@0.4.9';
import { SCOPE, clientId } from './clientId.js';

/* Convert DID into handle if DID is from bluesky */
const HANDLE_RESOLVER = 'https://bsky.social';

/* The PDS endpoint that describes a repo. Its answer includes the handle of the repo owner. */
const DESCRIBE_REPO_PATH = '/xrpc/com.atproto.repo.describeRepo';

/* The handle a PDS gives when the real handle is not valid */
const INVALID_HANDLE = 'handle.invalid';

let client = null;
let session = null;
let initPromise = null;

/**
 * Called on page load. Does one of three things:
 *  1. Finish login if URL holds OAuth callback.
 *  2. Restore session from previous visit.
 *  3. Returns NULL when not signed in.
 * @returns {Promise<{did: string, handle?: string}|null>} The logged-in user, or null
 */
async function doInit() {
  /* The loopback flow requires the IP form of the address, not "localhost". */
  if (location.hostname === 'localhost') {
    location.replace(location.href.replace('//localhost', '//127.0.0.1'));
    return new Promise(() => {});
  }

  client = await BrowserOAuthClient.load({
    clientId: clientId(),
    handleResolver: HANDLE_RESOLVER,
    /* Fires when the session is revoked or can no longer be refreshed. */
    onSessionDeleted: () => {
      session = null;
      window.dispatchEvent(new CustomEvent('auth-ended'));
    },
  });

  const result = await client.init();
  session = result?.session ?? null;
  if (!session) {
    return null;
  }

  const user = { did: session.did };
  const handle = await fetchHandle();
  if (handle !== null) {
    user.handle = handle;
  }
  return user;
}

/**
 * Asks the user's PDS for the handle of the logged-in user (for example 'you.bsky.social').
 * The session holds only the DID, so the handle needs one request.
 * The login must not fail because of the handle, so all errors give null.
 * @returns {Promise<string|null>} The handle, or null when the PDS does not give a usable one
 */
async function fetchHandle() {
  const path = DESCRIBE_REPO_PATH + '?repo=' + encodeURIComponent(session.did);

  let data;
  try {
    const response = await session.fetchHandler(path);
    if (!response.ok) {
      return null;
    }
    data = await response.json();
  } catch {
    return null;
  }

  const handle = data.handle;
  if (typeof handle !== 'string') {
    return null;
  }
  if (handle === '') {
    return null;
  }
  /* The PDS gives this value when the handle does not point back to the DID. */
  if (handle === INVALID_HANDLE) {
    return null;
  }
  return handle;
}

/**
 * Initialize login if not already initialized
 */
export function initAuth() {
  return (initPromise ??= doInit());
}

/**
 * Send browser to user's sign-in page.
 */
export async function signIn(handle) {
  if (!client) {
    throw new Error('Call initAuth() first.');
  }
  await client.signIn(handle.trim().replace(/^@/, ''), { scope: SCOPE });
}

/**
 * Reset session and revoke tokens
 */
export async function signOut() {
  const s = session;
  session = null;
  initPromise = Promise.resolve(null); // don't serve the stale signed-in result
  if (s) await s.signOut();
}

/**
 * Retrieve user's DID
 */
export function currentDid() {
  return session ? session.did : null;
}

/**
 * Fetch the user's PDS.
 */
export async function authFetch(path, init) {
  if (!session) throw new Error('Not signed in.');
  return session.fetchHandler(path, init);
}
