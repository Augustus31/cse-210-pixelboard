import { createPdsImageStore } from "./pdsImageStore.js";

/**
 * Connects PNG storage to the OAuth owner's session and authenticated fetch helpers.
 * Initializes OAuth before accessing the DID; never substitutes a local login or store.
 * @param {object} options - Storage settings passed to createPdsImageStore.
 * @param {string} [options.collection] - Defaults to cloud.pixelboard.imageBoard.
 * @param {Function} loadAuth - Loads the OAuth module supplied by the integrating frontend.
 * @returns {Promise<object>} The PDS save, list, load, update, and delete API.
 */
export async function createAuthenticatedPdsStore(
  options,
  loadAuth,
) {
  if (typeof loadAuth !== "function") {
    throw new Error("Provide the OAuth module loader when connecting PDS storage.");
  }
  const auth = await loadAuth();
  await auth.initAuth();
  return createPdsImageStore({
    ...options,
    authFetch: auth.authFetch,
    currentDid: auth.currentDid,
  });
}
