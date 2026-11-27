/** Connects authenticated requests to the methods used by board-convert.js. */
export const BOARD_COLLECTION = "cloud.pixelboard.imageBoard";

/**
 * Creates the Agent methods that board-convert.js needs to read and write drawings.
 * @param {object} options - Request functions and an optional record preparation callback.
 * @param {Function} options.authFetch - Sends authenticated requests to the user's PDS.
 * @param {Function} options.currentDid - Returns the current user's DID, or null when signed out.
 * @param {Function} [options.prepareWrite] - Adds timestamps or other fields before the write.
 * @returns {object} The request methods used by the drawing conversion functions.
 */
export function createOAuthAgent({ authFetch, currentDid, prepareWrite = (body) => body }) {
  if (typeof authFetch !== "function" || typeof currentDid !== "function") {
    throw new Error("PDS storage requires authFetch and currentDid.");
  }
  const did = currentDid();
  function requireAccount() {
    if (typeof did !== "string" || !did.startsWith("did:")) {
      throw new Error("Sign in before saving or opening PDS drawings.");
    }
    if (currentDid() !== did) throw new Error("Your account changed. Reload the drawings.");
    return did;
  }

  /**
   * Sends a request and checks that the account has not changed while waiting.
   * @param {string} endpoint - The com.atproto endpoint suffix.
   * @param {object|Blob} body - Query parameters, a JSON request body, or a PNG Blob.
   * @param {boolean} [write=false] - Whether this is a POST operation.
   * @param {boolean} [binary=false] - Whether to read a successful response as a Blob.
   * @returns {Promise<{data: object|Blob}>} Response data in the format expected by Agent methods.
   */
  async function request(endpoint, body, write = false, binary = false) {
    requireAccount();
    if (body?.repo && body.repo !== did) {
      throw new Error("Cannot write another account's drawings.");
    }
    const suffix = write ? "" : `?${new globalThis.URLSearchParams(body)}`;
    const init = write ? {
      method: "POST",
      headers: { "Content-Type": body instanceof globalThis.Blob
        ? "image/png" : "application/json" },
      body: body instanceof globalThis.Blob ? body : JSON.stringify(body),
    } : { method: "GET" };
    let response;
    try {
      response = await authFetch(`/xrpc/com.atproto.${endpoint}${suffix}`, init);
    } catch (cause) {
      throw new Error("Could not reach your PDS. Check your connection and sign-in.", { cause });
    }
    requireAccount();
    if (binary && response.ok) {
      const data = await response.blob();
      requireAccount();
      return { data };
    }
    let data;
    try {
      data = await response.json();
    } catch (cause) {
      throw new Error(`PDS returned an unreadable response (HTTP ${response.status}).`, { cause });
    }
    requireAccount();
    if (!response.ok) {
      const message = [401, 403].includes(response.status)
        ? "PDS access denied. Sign in again with permission to save drawings."
        : response.status === 429 ? "PDS request limit reached. Try again later."
          : data?.error === "InvalidSwap" ? "This drawing changed. Reload before saving."
            : `PDS ${endpoint} failed (HTTP ${response.status}).`;
      const error = new Error(message);
      error.error = data?.error;
      error.status = response.status;
      throw error;
    }
    return { data };
  }

  const get = (method) => (query) => request(`repo.${method}`, query);
  const post = (method) => (body) => request(`repo.${method}`, body, true);
  const writeRecord = (method) => (body) => post(method)(prepareWrite({
    ...body, record: { ...body.record, $type: BOARD_COLLECTION },
  }));
  return {
    get assertDid() { return requireAccount(); },
    uploadBlob: (blob) => request("repo.uploadBlob", blob, true),
    com: { atproto: {
      repo: {
        createRecord: writeRecord("createRecord"),
        putRecord: writeRecord("putRecord"),
        getRecord: get("getRecord"),
        listRecords: get("listRecords"),
        deleteRecord: post("deleteRecord"),
      },
      sync: { getBlob: (query) => request("sync.getBlob", query, false, true) },
    } },
  };
}
