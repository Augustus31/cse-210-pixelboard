/**
 * Makes the OAuth client id, the text that tells the sign-in server which app asks for login.
 * @module Oauth/clientId
 */

/* scope of permissions to ask for
 * "transition:generic" adds reading and writing records in the user's repo.
 */
export const SCOPE = 'atproto transition:generic';

/* Resolved relative to this file, so it works from any page or folder. */
const CLIENT_METADATA_FILE = 'client-metadata.json';

/* The host names of a local development page (see doInit in oauthClient.js for 'localhost') */
const LOCAL_HOST_NAMES = ['127.0.0.1', '[::1]'];

/**
 * Retrieve client identity (either local dev, or our domain specified in client-metadata.json)
 *
 * NOTE 1: choosing not to "burn" the metadata so we can have the file as single source of truth.
 * See https://github.com/bluesky-social/atproto/tree/main/packages/oauth/oauth-client-browser#client-metadata
 *
 * NOTE 2: for local dev, convert localhost to 127.0.0.1 (see https://atproto.com/specs/oauth#localhost-client-development)
 * @returns {string} The client id
 */
export function clientId() {
  const isLocal = LOCAL_HOST_NAMES.includes(location.hostname);

  /* not local, refer to client metadata file for URL */
  if (isLocal == false) {
    const metadataUrl = new URL(CLIENT_METADATA_FILE, import.meta.url);
    return metadataUrl.href;
  }

  /* local dev, build local host URI */
  const redirectUri = location.origin + location.pathname;
  const redirectPart = '?redirect_uri=' + encodeURIComponent(redirectUri);
  const scopePart = '&scope=' + encodeURIComponent(SCOPE);
  return 'http://localhost' + redirectPart + scopePart;
}
