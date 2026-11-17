// AT Protocol OAuth

import { BrowserOAuthClient } from 'https://esm.sh/@atproto/oauth-client-browser@0.4.9';

/* Convert DID into handle if DID is from bluesky */
const HANDLE_RESOLVER = 'https://bsky.social';

/* scope of permissions to ask for
 * "transition:generic" adds reading and writing records in the user's repo.
 */
const SCOPE = 'atproto transition:generic';

/* Resolved relative to this file, so it works from any page or folder. */
const CLIENT_METADATA_FILE = 'client-metadata.json';

let client = null;
let session = null;
let initPromise = null;

/**
 * Retrieve client identity (either local dev, or our domain specified in client-metadata.json)
 *
 * NOTE 1: choosing not to "burn" the metadata so we can have the file as single source of truth.
 * See https://github.com/bluesky-social/atproto/tree/main/packages/oauth/oauth-client-browser#client-metadata
 *
 * NOTE 2: for local dev, convert localhost to 127.0.0.1 (see https://atproto.com/specs/oauth#localhost-client-development)
 */
function clientId() {
  const local = ['127.0.0.1', '[::1]'].includes(location.hostname);

  /* not local, refer to client metadata file for URL */
  if (!local) return new URL(CLIENT_METADATA_FILE, import.meta.url).href;

  /* local dev, build local host URI */
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
  return session ? { did: session.did } : null;
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

