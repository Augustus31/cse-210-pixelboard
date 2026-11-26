/** Adapts the OAuth owner's fetch helpers to the Lexicon conversion API. */
export const BOARD_COLLECTION = "cloud.pixelboard.imageBoard";

/**
 * Supplies the Agent methods used by board-convert.js without another login or SDK.
 * @param {object} options - Authentication and per-operation write metadata.
 * @param {Function} options.authFetch - Miguel's authenticated request helper.
 * @param {Function} options.currentDid - Miguel's current account helper.
 * @param {Function} [options.prepareWrite] - Adds timestamps and conditional write fields.
 * @returns {object} An Agent-compatible subset backed only by the OAuth session.
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
   * Checks the session around each request and adapts fetch responses to Agent envelopes.
   * @param {string} endpoint - The com.atproto endpoint suffix.
   * @param {object|Blob} body - Query parameters, a record envelope, or a PNG Blob.
   * @param {boolean} [write=false] - Whether this is a POST operation.
   * @param {boolean} [binary=false] - Whether to return downloaded image bytes.
   * @returns {Promise<{data: object|Blob}>} The response expected by Lexicon helpers.
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
