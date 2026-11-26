import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createPdsImageStore, timeFromRecordKey } from "./pdsImageStore.js";
import { BOARD_COLLECTION } from "./oauthAgent.js";

// Canvas primitives are test doubles. Production calls the actual Lexicon functions.
const previousDocument = globalThis.document;
const previousBitmap = globalThis.createImageBitmap;
before(() => {
  globalThis.document = { createElement: () => {
    let bytes;
    const canvas = { width: 0, height: 0 };
    canvas.getContext = () => ({
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: (image) => { bytes = [...image.data]; },
      drawImage: (bitmap) => { bytes = bitmap.bytes; },
      getImageData: () => ({ data: bytes }),
    });
    canvas.toBlob = (callback) => callback(new globalThis.Blob([
      JSON.stringify({ width: canvas.width, height: canvas.height, bytes }),
    ], { type: "image/png" }));
    return canvas;
  } };
  globalThis.createImageBitmap = async (blob) => ({
    ...JSON.parse(await blob.text()), close() {},
  });
});
after(() => {
  if (previousDocument === undefined) delete globalThis.document;
  else globalThis.document = previousDocument;
  if (previousBitmap === undefined) delete globalThis.createImageBitmap;
  else globalThis.createImageBitmap = previousBitmap;
});

function fixture({ pageSize = 100, intercept } = {}) {
  const owner = "did:plc:owner";
  let did = owner;
  let time = "2026-11-26T12:00:00.000Z";
  let sequence = 0;
  const records = new Map();
  const blobs = new Map();
  const calls = [];
  const json = (value, status = 200) => new globalThis.Response(JSON.stringify(value), { status });
  const authFetch = async (path, init) => {
    const url = new globalThis.URL(path, "https://pds.example");
    const method = url.pathname.split(".").at(-1);
    const body = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
    calls.push({ method, body, url });
    const response = await intercept?.({ method, body, json });
    if (response) return response;
    if (method === "uploadBlob") {
      assert.equal(init.headers["Content-Type"], "image/png");
      const cid = `blob-${++sequence}`;
      blobs.set(cid, body);
      return json({ blob: {
        $type: "blob", ref: { $link: cid }, mimeType: "image/png", size: body.size,
      } });
    }
    if (method === "createRecord" || method === "putRecord") {
      assert.equal(body.repo, owner);
      assert.equal(body.collection, BOARD_COLLECTION);
      assert.equal(body.record.$type, BOARD_COLLECTION);
      const id = body.rkey ?? `drawing-${++sequence}`;
      if (body.swapRecord) assert.equal(body.swapRecord, records.get(id)?.cid);
      const entry = {
        uri: `at://${owner}/${BOARD_COLLECTION}/${id}`,
        cid: `record-${++sequence}`, value: body.record,
      };
      records.set(id, entry);
      return json({ uri: entry.uri, cid: entry.cid });
    }
    if (method === "listRecords") {
      const start = Number(url.searchParams.get("cursor") ?? 0);
      const all = [...records.values()];
      return json({ records: all.slice(start, start + pageSize),
        ...(start + pageSize < all.length ? { cursor: String(start + pageSize) } : {}) });
    }
    if (method === "getRecord") {
      return records.has(url.searchParams.get("rkey"))
        ? json(records.get(url.searchParams.get("rkey"))) : json({ error: "RecordNotFound" }, 400);
    }
    if (method === "getBlob") {
      const blob = blobs.get(url.searchParams.get("cid"));
      return blob ? new globalThis.Response(blob) : json({ error: "BlobNotFound" }, 404);
    }
    if (method === "deleteRecord") {
      assert.equal(body.swapRecord, records.get(body.rkey).cid);
      records.delete(body.rkey);
      return json({});
    }
    throw new Error(`Unexpected endpoint ${method}`);
  };
  const store = createPdsImageStore({
    authFetch, currentDid: () => did, now: () => new Date(time),
  });
  return { store, calls, records, setDid: (value) => { did = value; },
    setTime: (value) => { time = value; } };
}
const drawing = (size = 25, color = "#123456") => ({
  size, pixels: Array(size * size).fill(color),
});

for (const size of [25, 40, 64, 512]) {
  test(`shared Lexicon helpers save and restore ${size} square pixels`, async () => {
    const f = fixture();
    const saved = await f.store.saveDraft(drawing(size));
    assert.match(saved.uri, /^at:\/\/did:plc:owner\/cloud\.pixelboard\.imageBoard\//);
    assert.equal(saved.savedAt, "2026-11-26T12:00:00.000Z");
    assert.deepEqual((await f.store.loadDraft(saved.id)).pixels, drawing(size).pixels);
  });
}

test("updates preserve creation time and identity; list sorts by last saved time", async () => {
  const f = fixture({ pageSize: 1 });
  const first = await f.store.saveDraft(drawing());
  f.setTime("2026-11-26T13:00:00.000Z");
  const second = await f.store.saveDraft(drawing(40));
  f.setTime("2026-11-26T14:00:00.000Z");
  const updated = await f.store.updateDraft(first.id, drawing(64, "#abcdef"));
  assert.equal(updated.uri, first.uri);
  assert.equal(f.records.get(first.id).value.createdAt, first.savedAt);
  assert.equal(f.records.get(first.id).value.updatedAt, updated.savedAt);
  assert.deepEqual((await f.store.listDrafts()).map((item) => item.id), [first.id, second.id]);
  assert.equal(await f.store.deleteDraft(first.id), true);
  assert.equal(await f.store.loadDraft(first.id), null);
  assert.equal(await f.store.deleteDraft(first.id), false);
  assert.equal(f.records.size, 1);
});

test("legacy records without timestamps still load", async () => {
  const f = fixture();
  const saved = await f.store.saveDraft(drawing());
  delete f.records.get(saved.id).value.createdAt;
  delete f.records.get(saved.id).value.updatedAt;
  assert.equal((await f.store.loadDraft(saved.id)).savedAt, new Date(0).toISOString());
  assert.equal(timeFromRecordKey("legacy"), new Date(0).toISOString());
});

test("snapshot limit blocks new saves but allows updates and deletion", async () => {
  const f = fixture();
  let saved;
  for (let i = 0; i < 4; i++) saved = await f.store.saveDraft(drawing());
  await assert.rejects(f.store.saveDraft(drawing()), /Delete a draft/);
  await f.store.updateDraft(saved.id, drawing(40));
  await f.store.deleteDraft(saved.id);
  await f.store.saveDraft(drawing());
  assert.equal(f.records.size, 4);
});

test("invalid pixels, unsupported dimensions and signed-out sessions cannot write", async () => {
  const f = fixture();
  for (const input of [drawing(513), { size: 25, pixels: Array(625) }, drawing(25, "wrong")]) {
    await assert.rejects(f.store.saveDraft(input), /Drawings require/);
  }
  f.setDid(null);
  await assert.rejects(f.store.listDrafts(), /Sign in/);
  assert.equal(f.calls.length, 0);
});

test("an account switch during upload stops record creation", async () => {
  let f;
  f = fixture({ intercept: ({ method }) => {
    if (method === "uploadBlob") f.setDid("did:plc:other");
  } });
  await assert.rejects(f.store.saveDraft(drawing()), /account changed/);
  assert.equal(f.calls.some((call) => call.method === "createRecord"), false);
});

for (const [status, error, message] of [
  [403, "Forbidden", /access denied/], [429, "RateLimit", /request limit/],
  [400, "InvalidSwap", /changed/], [413, "BlobTooLarge", /HTTP 413/],
]) {
  test(`HTTP ${status} rejects without false success or automatic retries`, async () => {
    const f = fixture({ intercept: ({ method, json }) => method === "uploadBlob"
      ? json({ error }, status) : undefined });
    await assert.rejects(f.store.saveDraft(drawing()), message);
    assert.equal(f.calls.filter((call) => call.method === "uploadBlob").length, 1);
    assert.equal(f.records.size, 0);
  });
}

test("missing records and missing PNG data have distinct results", async () => {
  const f = fixture({ intercept: ({ method, json }) => method === "getBlob"
    ? json({ error: "BlobNotFound" }, 404) : undefined });
  assert.equal(await f.store.loadDraft("absent"), null);
  await assert.rejects(f.store.updateDraft("absent", drawing()), /no longer exists/);
  await assert.rejects(f.store.saveDraft(drawing()), /getBlob failed/);
});

test("repeated pagination cursors reject instead of looping", async () => {
  const f = fixture({ intercept: ({ method, json }) => method === "listRecords"
    ? json({ records: [], cursor: "repeat" }) : undefined });
  await assert.rejects(f.store.listDrafts(), /pagination cursor/);
});
