import { saveBoard, loadBoard, updateBoard } from "../../lexicons/board-convert.js";
import { BOARD_COLLECTION, createOAuthAgent } from "./oauthAgent.js";
import { timeFromRecordKey } from "./recordTime.js";
export { timeFromRecordKey } from "./recordTime.js";

const RKEY = /^(?!\.{1,2}$)[a-zA-Z0-9._~:-]{1,512}$/;
const HEX = /^#[0-9a-f]{6}$/i;
const validTime = (value) => typeof value === "string" && Number.isFinite(Date.parse(value));

/**
 * Connects the existing drafts API to Lexicon helpers and Miguel's OAuth session.
 * PNG conversion and save/load/update are delegated to board-convert.js.
 * @param {object} options - Storage dependencies and limits.
 * @param {Function} options.authFetch - Miguel's authenticated PDS fetch helper.
 * @param {Function} options.currentDid - Miguel's current DID helper.
 * @param {string} [options.collection] - Must match the merged Lexicon collection.
 * @param {number} [options.maxDrafts=4] - Existing frontend snapshot limit.
 * @param {Function} [options.now] - Clock for createdAt and updatedAt.
 * @returns {object} The save, list, load, update, and delete drafts API.
 */
export function createPdsImageStore({
  authFetch, currentDid, collection = BOARD_COLLECTION, maxDrafts = 4,
  now = () => new Date(),
}) {
  if (collection !== BOARD_COLLECTION) {
    throw new Error(`Use the Lexicon collection ${BOARD_COLLECTION}.`);
  }
  if (!Number.isInteger(maxDrafts) || maxDrafts < 1) throw new Error("Invalid draft limit.");
  // Validate auth dependencies at construction without requiring a signed-in session yet.
  createOAuthAgent({ authFetch, currentDid });
  const idFromUri = (uri, did) => {
    const prefix = `at://${did}/${collection}/`;
    if (typeof uri !== "string" || !uri.startsWith(prefix)
      || !RKEY.test(uri.slice(prefix.length))) {
      throw new Error("PDS returned an invalid drawing URI.");
    }
    return uri.slice(prefix.length);
  };
  const validateId = (id) => {
    if (typeof id !== "string" || !RKEY.test(id)) throw new Error("Invalid drawing id.");
  };
  function snapshot({ size, pixels } = {}) {
    if (!Number.isInteger(size) || size < 1 || size > 512 || !Array.isArray(pixels)
      || pixels.length !== size * size
      || !Array.from(pixels).every((p) => typeof p === "string" && HEX.test(p))) {
      throw new Error("Drawings require size 1–512 and size × size #rrggbb pixels.");
    }
    return { size, pixels: pixels.slice() };
  }
  function agentFor(existing) {
    const time = now().toISOString();
    return createOAuthAgent({ authFetch, currentDid, prepareWrite: (body) => ({
      ...body,
      ...(existing?.cid ? { swapRecord: existing.cid } : {}),
      record: {
        ...body.record,
        createdAt: validTime(existing?.value?.createdAt) ? existing.value.createdAt
          : existing ? timeFromRecordKey(existing.id) : time,
        updatedAt: time,
      },
    }) });
  }
  function checkEntry(entry, did) {
    const id = idFromUri(entry?.uri, did);
    const value = entry?.value;
    if (value?.$type !== collection || !Number.isInteger(value.width)
      || value.width < 1 || value.width > 512 || value.height !== value.width
      || value.image?.mimeType !== "image/png" || !value.image.ref?.$link) {
      throw new Error("Unsupported or damaged PDS drawing record.");
    }
    return id;
  }
  async function getEntry(agent, id) {
    validateId(id);
    try {
      const { data } = await agent.com.atproto.repo.getRecord({
        repo: agent.assertDid, collection, rkey: id,
      });
      if (checkEntry(data, agent.assertDid) !== id) {
        throw new Error("PDS returned another drawing.");
      }
      return { ...data, id };
    } catch (error) {
      if ([400, 404].includes(error.status) && error.error === "RecordNotFound") return null;
      throw error;
    }
  }
  async function entries(agent) {
    const found = new Map();
    const cursors = new Set();
    let cursor;
    do {
      const { data } = await agent.com.atproto.repo.listRecords({
        repo: agent.assertDid, collection, limit: "100", ...(cursor ? { cursor } : {}),
      });
      if (!Array.isArray(data?.records)) throw new Error("PDS returned an invalid drawing list.");
      for (const entry of data.records) {
        const id = checkEntry(entry, agent.assertDid);
        found.set(id, { ...entry, id });
      }
      cursor = data.cursor;
      if (cursor !== undefined && (typeof cursor !== "string" || cursors.has(cursor))) {
        throw new Error("PDS returned an invalid pagination cursor.");
      }
      if (cursor) cursors.add(cursor);
    } while (cursor);
    return [...found.values()];
  }
  const savedTime = (entry) => validTime(entry.value.updatedAt) ? entry.value.updatedAt
    : validTime(entry.value.createdAt) ? entry.value.createdAt : timeFromRecordKey(entry.id);
  async function decode(agent, entry) {
    const drawing = snapshot(await loadBoard(agent, entry.id));
    checkEntry(entry, agent.assertDid);
    return { ...drawing, id: entry.id, uri: entry.uri, cid: entry.cid, savedAt: savedTime(entry) };
  }

  /**
   * Creates a PDS snapshot and returns its AT URI for backend submission.
   * @param {{size: number, pixels: string[]}} canvas - The current drawing.
   * @returns {Promise<object>} A saved frontend draft plus URI and CID.
   */
  async function saveDraft(canvas) {
    const drawing = snapshot(canvas);
    const agent = agentFor();
    const did = agent.assertDid;
    if ((await entries(agent)).length >= maxDrafts) {
      throw new Error("Delete a draft before saving.");
    }
    const result = await saveBoard(agent, drawing.pixels, drawing.size);
    const id = idFromUri(result.uri, did);
    const entry = await getEntry(agent, id);
    if (!entry) throw new Error("PDS save could not be confirmed. Reload before retrying.");
    return decode(agent, entry);
  }
  /** @returns {Promise<object[]>} PDS drawings ordered by last saved time. */
  async function listDrafts() {
    const agent = agentFor();
    const result = [];
    for (const entry of await entries(agent)) result.push(await decode(agent, entry));
    return result.sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt));
  }
  /**
   * Loads editable pixels through the Lexicon decoder.
   * @param {string} id - The record key selected by the UI.
   * @returns {Promise<object|null>} The drawing, or null if its record is absent.
   */
  async function loadDraft(id) {
    const agent = agentFor();
    const entry = await getEntry(agent, id);
    return entry ? decode(agent, entry) : null;
  }
  /**
   * Updates the same record and preserves its creation time.
   * @param {string} id - The existing record key.
   * @param {{size: number, pixels: string[]}} canvas - The replacement drawing.
   * @returns {Promise<object>} The updated editable draft and backend identifiers.
   */
  async function updateDraft(id, canvas) {
    const drawing = snapshot(canvas);
    const readAgent = agentFor();
    const entry = await getEntry(readAgent, id);
    if (!entry) throw new Error("This drawing no longer exists. Save it as a new draft.");
    const agent = agentFor(entry);
    if (agent.assertDid !== readAgent.assertDid) throw new Error("Your account changed.");
    const result = await updateBoard(agent, drawing.pixels, drawing.size, id);
    if (idFromUri(result.uri, agent.assertDid) !== id) {
      throw new Error("PDS returned another drawing.");
    }
    const saved = await getEntry(agent, id);
    if (!saved) throw new Error("PDS update could not be confirmed. Reload before retrying.");
    return decode(agent, saved);
  }
  /**
   * Deletes only the selected PDS record, using its CID to detect a stale selection.
   * @param {string} id - The selected record key.
   * @returns {Promise<boolean>} Whether an existing record was deleted.
   */
  async function deleteDraft(id) {
    const agent = agentFor();
    const entry = await getEntry(agent, id);
    if (!entry) return false;
    await agent.com.atproto.repo.deleteRecord({
      repo: agent.assertDid, collection, rkey: id, ...(entry.cid ? { swapRecord: entry.cid } : {}),
    });
    return true;
  }
  return { saveDraft, listDrafts, loadDraft, updateDraft, deleteDraft };
}
