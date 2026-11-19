/** PDS persistence for the Lexicon group's whole-canvas PNG Blob record proposal. */
import { createPngCodec, snapshotDrawing } from "./pngCodec.js";

const NSID = /^[a-zA-Z][a-zA-Z0-9-]*(\.[a-zA-Z0-9][a-zA-Z0-9-]*)+\.[a-zA-Z][a-zA-Z0-9]*$/;
const RKEY = /^(?!\.{1,2}$)[a-zA-Z0-9._~:-]{1,512}$/;
const BASE32 = "234567abcdefghijklmnopqrstuvwxyz";

/**
 * Reads a creation time from a TID when the proposed record has no timestamp field.
 * @param {string} id - The record key assigned by the PDS.
 * @returns {string} The ISO creation time, or the epoch for a non-TID legacy key.
 */
export function timeFromRecordKey(id) {
  if (!/^[234567abcdefghij][234567abcdefghijklmnopqrstuvwxyz]{12}$/.test(id)) {
    return new Date(0).toISOString();
  }
  let value = 0n;
  for (const character of id) value = value * 32n + BigInt(BASE32.indexOf(character));
  const millis = Number((value >> 10n) / 1000n);
  return new Date(millis).toISOString();
}

/**
 * Creates the frontend's storage API using PNG Blob records and authenticated requests.
 * No collection is guessed: the team's approved, valid NSID must be configured.
 * @param {object} options - Injected auth and encoding dependencies.
 * @param {Function} options.authFetch - Authenticated requests to the user's PDS.
 * @param {Function} options.currentDid - The current DID, or null when signed out.
 * @param {string} options.collection - The agreed record collection.
 * @param {{encode: Function, decode: Function}} [options.codec] - Browser PNG conversion.
 * @param {number} [options.maxDrafts=4] - The latest frontend's snapshot limit.
 * @param {number} [options.maxBlobBytes=1000000] - Client-side image download/upload cap.
 * @returns {{saveDraft: Function, listDrafts: Function, loadDraft: Function,
 * updateDraft: Function, deleteDraft: Function}} The frontend storage API.
 */
export function createPdsImageStore({
  authFetch,
  currentDid,
  collection,
  codec = createPngCodec(),
  maxDrafts = 4,
  maxBlobBytes = 1000000,
}) {
  if (typeof authFetch !== "function" || typeof currentDid !== "function") {
    throw new Error("PDS storage requires authFetch and currentDid.");
  }
  if (
    typeof collection !== "string" ||
    !NSID.test(collection) ||
    collection.length > 317 ||
    collection.split(".").some((part) => part.length > 63 || part.endsWith("-"))
  ) {
    throw new Error("Configure a valid collection NSID approved by the Lexicon team.");
  }

  function account() {
    const did = currentDid();
    if (typeof did !== "string" || !did.startsWith("did:")) {
      throw new Error("Sign in before saving or opening PDS drawings.");
    }
    return did;
  }

  function sameAccount(did) {
    if (currentDid() !== did) throw new Error("Your account changed. Reload the drawings.");
  }

  function validateId(id) {
    if (typeof id !== "string" || !RKEY.test(id)) throw new Error("Invalid drawing id.");
  }

  function keyFromUri(uri, did) {
    const prefix = `at://${did}/${collection}/`;
    if (typeof uri !== "string" || !uri.startsWith(prefix)) return null;
    const id = uri.slice(prefix.length);
    return RKEY.test(id) ? id : null;
  }

  /**
   * Sends JSON or binary XRPC data and checks identity before accepting a response.
   * @param {string} endpoint - The repository or sync endpoint name.
   * @param {string} did - The account that started this operation.
   * @param {object} [options] - Query, body, binary, and missing-record options.
   * @returns {Promise<object|Blob|null>} The validated response envelope or image bytes.
   */
  async function request(endpoint, did, { query, body, binary, missing = false } = {}) {
    sameAccount(did);
    const suffix = query ? `?${new globalThis.URLSearchParams(query)}` : "";
    const init =
      body === undefined
        ? { method: "GET" }
        : {
            method: "POST",
            headers: {
              "Content-Type": body instanceof globalThis.Blob ? "image/png" : "application/json",
            },
            body: body instanceof globalThis.Blob ? body : JSON.stringify(body),
          };
    let response;
    try {
      response = await authFetch(`/xrpc/com.atproto.${endpoint}${suffix}`, init);
    } catch (cause) {
      throw new Error("Could not reach your PDS. Check your connection and sign-in.", { cause });
    }
    sameAccount(did);
    if (response.ok && binary) {
      const length = Number(response.headers.get("Content-Length"));
      if (length > maxBlobBytes) throw new Error("The saved PNG exceeds the image size limit.");
      const blob = await response.blob();
      sameAccount(did);
      if (blob.size > maxBlobBytes) throw new Error("The saved PNG exceeds the image size limit.");
      return blob;
    }
    let data;
    try {
      data = await response.json();
    } catch (cause) {
      throw new Error(`PDS returned an unreadable response (HTTP ${response.status}).`, { cause });
    }
    sameAccount(did);
    if (!response.ok) {
      if (missing && [400, 404].includes(response.status) && data?.error === "RecordNotFound")
        return null;
      if ([401, 403].includes(response.status)) {
        throw new Error("PDS access denied. Sign in again with permission to save drawings.");
      }
      if (response.status === 429) throw new Error("PDS request limit reached. Try again later.");
      if (data?.error === "InvalidSwap") {
        throw new Error("This drawing changed since it was loaded. Reload before saving.");
      }
      throw new Error(`PDS ${endpoint} failed (HTTP ${response.status}).`);
    }
    return data;
  }

  function validEntry(entry, did) {
    const record = entry?.value;
    return (
      keyFromUri(entry?.uri, did) &&
      record?.$type === collection &&
      [25, 40, 64].includes(record.width) &&
      record.height === record.width &&
      record.image?.$type === "blob" &&
      record.image.mimeType === "image/png" &&
      typeof record.image.ref?.$link === "string" &&
      record.image.ref.$link.length > 0 &&
      Number.isInteger(record.image.size) &&
      record.image.size > 0 &&
      record.image.size <= maxBlobBytes
    );
  }

  async function entries(did) {
    const records = new Map();
    const cursors = new Set();
    let cursor;
    do {
      const query = { repo: did, collection, limit: "100" };
      if (cursor) query.cursor = cursor;
      const page = await request("repo.listRecords", did, { query });
      if (!Array.isArray(page?.records)) throw new Error("PDS returned an invalid drawing list.");
      for (const entry of page.records) {
        if (validEntry(entry, did)) records.set(keyFromUri(entry.uri, did), entry);
      }
      cursor = page.cursor;
      if (cursor !== undefined && (typeof cursor !== "string" || cursors.has(cursor))) {
        throw new Error("PDS returned an invalid pagination cursor.");
      }
      if (cursor) cursors.add(cursor);
    } while (cursor);
    return [...records.values()];
  }

  async function find(id, did) {
    validateId(id);
    return request("repo.getRecord", did, {
      query: { repo: did, collection, rkey: id },
      missing: true,
    });
  }

  async function decode(entry, did) {
    if (!validEntry(entry, did)) throw new Error("Unsupported or damaged PDS drawing record.");
    const id = keyFromUri(entry.uri, did);
    const blob = await request("sync.getBlob", did, {
      query: { did, cid: entry.value.image.ref.$link },
      binary: true,
    });
    const drawing = snapshotDrawing(await codec.decode(blob, entry.value));
    sameAccount(did);
    return { id, ...drawing, savedAt: timeFromRecordKey(id) };
  }

  async function write(drawing, did, existing) {
    const png = await codec.encode(drawing);
    sameAccount(did);
    if (
      !(png instanceof globalThis.Blob) ||
      png.type !== "image/png" ||
      png.size === 0 ||
      png.size > maxBlobBytes
    ) {
      throw new Error("PNG encoding failed or the image exceeds the size limit.");
    }
    const uploaded = await request("repo.uploadBlob", did, { body: png });
    const record = {
      $type: collection,
      image: uploaded?.blob,
      width: drawing.size,
      height: drawing.size,
    };
    if (!validEntry({ uri: `at://${did}/${collection}/check`, value: record }, did)) {
      throw new Error("PDS returned an invalid uploaded Blob reference.");
    }
    const body = { repo: did, collection, record };
    if (existing) {
      body.rkey = keyFromUri(existing.uri, did);
      if (existing.cid) body.swapRecord = existing.cid;
    }
    const result = await request(existing ? "repo.putRecord" : "repo.createRecord", did, { body });
    const id = keyFromUri(result?.uri, did);
    if (!id || (existing && id !== body.rkey)) {
      throw new Error("PDS save could not be confirmed. Reload drawings before retrying.");
    }
    return { id, ...drawing, savedAt: timeFromRecordKey(id) };
  }

  /**
   * Creates a new PNG-backed snapshot, respecting the frontend's four-draft limit.
   * @param {{size: number, pixels: string[]}} canvas - The drawing to snapshot.
   * @returns {Promise<object>} The saved draft after both upload and record creation succeed.
   */
  async function saveDraft(canvas) {
    const did = account();
    const drawing = snapshotDrawing(canvas);
    if ((await entries(did)).length >= maxDrafts) {
      throw new Error(`You can save up to ${maxDrafts} drafts. Delete a draft first.`);
    }
    return write(drawing, did);
  }

  /** @returns {Promise<object[]>} Decoded drawings, newest record key first. */
  async function listDrafts() {
    const did = account();
    const result = [];
    const sorted = (await entries(did)).sort((a, b) => b.uri.localeCompare(a.uri));
    for (const entry of sorted) result.push(await decode(entry, did));
    return result;
  }

  /**
   * Downloads one PNG and restores editable pixels without touching the page directly.
   * @param {string} id - The selected record key.
   * @returns {Promise<object|null>} The drawing, or null for a missing record.
   */
  async function loadDraft(id) {
    const did = account();
    const entry = await find(id, did);
    if (!entry) return null;
    if (keyFromUri(entry.uri, did) !== id) throw new Error("PDS returned a different drawing.");
    return decode(entry, did);
  }

  /**
   * Replaces an existing work using the same key; it does not create another snapshot.
   * @param {string} id - The existing work's record key.
   * @param {{size: number, pixels: string[]}} canvas - The replacement drawing.
   * @returns {Promise<object>} The updated work; missing records reject.
   */
  async function updateDraft(id, canvas) {
    const did = account();
    const drawing = snapshotDrawing(canvas);
    const entry = await find(id, did);
    if (!entry) throw new Error("This drawing no longer exists. Save it as a new draft.");
    if (!validEntry(entry, did) || keyFromUri(entry.uri, did) !== id) {
      throw new Error("Unsupported or damaged PDS drawing record.");
    }
    return write(drawing, did, entry);
  }

  /**
   * Deletes only the selected repository record after confirming that it exists.
   * @param {string} id - The draft record key to remove.
   * @returns {Promise<boolean>} False if already absent; true after a confirmed deletion.
   */
  async function deleteDraft(id) {
    const did = account();
    const entry = await find(id, did);
    if (!entry) return false;
    if (keyFromUri(entry.uri, did) !== id) throw new Error("PDS returned a different drawing.");
    const body = { repo: did, collection, rkey: id };
    if (entry.cid) body.swapRecord = entry.cid;
    await request("repo.deleteRecord", did, { body });
    return true;
  }

  return { saveDraft, listDrafts, loadDraft, updateDraft, deleteDraft };
}
