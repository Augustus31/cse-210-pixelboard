import { createPdsImageStore } from "./pdsImageStore.js";

/**
 * Initializes sign-in and creates a store for the user's saved drawings.
 * Waits for the current session to be restored before returning the store.
 * @param {object} options - Settings for the drawing store.
 * @param {string} [options.collection] - Defaults to cloud.pixelboard.imageBoard.
 * @param {Function} loadAuth - Loads the module that provides sign-in and authenticated requests.
 * @returns {Promise<object>} Methods for saving, listing, loading, updating, and deleting drawings.
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
