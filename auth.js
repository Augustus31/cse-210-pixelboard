// AT Protocol OAuth

import { BrowserOAuthClient } from '@atproto/oauth-client-browser'

/* ---- Settings ---- */
/* Convert DID into handle if DID is from bluesky */
const HANDLE_RESOLVER = 'https://bsky.social';

/* scope of permissions to ask for
 * "transition:generic" adds reading and writing records in the user's repo.
 */
const SCOPE = 'atproto transition:generic';

/* On a real https site, the client id is the URL of this file. */
const CLIENT_METADATA_FILE = 'client-metadata.json';

let client = null;
let session = null;

/**
 * Retrieve client identity
 *
 * for local dev, convert localhost to 127.0.0.1
 */
function clientId() {
    const local = ['127.0.0.1', '[::1]'].includes(location.hostname);
    if (!local) return new URL(CLIENT_METADATA_FILE, location.href).href;
    const redirectUri = location.origin + location.pathname;
    return (
        'http://localhost' +
        `?redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(SCOPE)}`
    );
}

/**
 * Called on page load. Does one of three things:
 *  1. Finish login if URL holds OAuth callback.
 *  2. Restore session from previous visit.
 *  3. Returns NULL when not signed in.
 */
export async function initAuth() {
  // The loopback flow requires the IP form of the address, not "localhost".
  if (location.hostname === 'localhost') {
    location.replace(location.href.replace('//localhost', '//127.0.0.1'));
    return new Promise(() => {}); // navigating away
  }
  client = await BrowserOAuthClient.load({
    clientId: clientId(),
    handleResolver: HANDLE_RESOLVER,
    // Fires when the session is revoked or can no longer be refreshed.
    onSessionDeleted: () => {
      session = null;
      window.dispatchEvent(new CustomEvent('auth-ended'));
    },
  });
  const result = await client.init();
  session = result?.session ?? null;
  return session ? { did: session.did } : null;
}

/**
 * Send browser to user's sign-in page.
 */
export async function signIn(handle) {
  if (!client) throw new Error('Call initAuth() first.');
  await client.signIn(handle.trim().replace(/^@/, ''), { scope: SCOPE });
}

/**
 * Reset session and revoke tokens
 */
export async function signOut() {
  const s = session;
  session = null;
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

