import test from "node:test";
import assert from "node:assert/strict";
import { createPdsImageStore, timeFromRecordKey } from "./pdsImageStore.js";

const collection = "org.example.board";
const did = "did:plc:owner";
const drawing = (size = 25, color = "#ffffff") => ({
  size,
  pixels: Array(size * size).fill(color),
});
const json = (data, status = 200) => new globalThis.Response(JSON.stringify(data), { status });
const uri = (id) => `at://${did}/${collection}/${id}`;
const base32 = "234567abcdefghijklmnopqrstuvwxyz";
function tid(micros) {
  let value = BigInt(micros) << 10n;
  let result = "";
  for (let i = 0; i < 13; i++) {
    result = base32[Number(value & 31n)] + result;
    value >>= 5n;
  }
  return result;
}

function fixture({ intercept, pageSize = 100 } = {}) {
  const records = new Map();
  const blobs = new Map();
  const calls = [];
  let current = did;
  let sequence = 0;
  const codec = {
    encode: async (canvas) => new globalThis.Blob([JSON.stringify(canvas)], { type: "image/png" }),
    decode: async (blob) => JSON.parse(await blob.text()),
  };
  const authFetch = async (path, init) => {
    const url = new globalThis.URL(path, "https://pds.example");
    const method = url.pathname.split(".").at(-1);
    const body = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
    calls.push({ method, body, url });
    const intercepted = await intercept?.({ method, body, url });
    if (intercepted) return intercepted;
    assert.equal(url.searchParams.get("repo") ?? body?.repo ?? did, did);
    if (method === "uploadBlob") {
      assert.equal(init.headers["Content-Type"], "image/png");
      const cid = `blob-${++sequence}`;
      blobs.set(cid, body);
      return json({
        blob: { $type: "blob", ref: { $link: cid }, mimeType: "image/png", size: body.size },
      });
    }
    if (method === "createRecord" || method === "putRecord") {
      const id = body.rkey ?? tid(1795000000000000n + BigInt(++sequence));
      if (body.swapRecord) assert.equal(records.get(id).cid, body.swapRecord);
      const entry = { uri: uri(id), cid: `record-${++sequence}`, value: body.record };
      records.set(id, entry);
      return json({ uri: entry.uri, cid: entry.cid });
    }
    if (method === "listRecords") {
      const offset = Number(url.searchParams.get("cursor") ?? 0);
      const all = [...records.values()];
      const end = offset + pageSize;
      return json({
        records: all.slice(offset, end),
        ...(end < all.length ? { cursor: String(end) } : {}),
      });
    }
    if (method === "getRecord") {
      const entry = records.get(url.searchParams.get("rkey"));
      return entry ? json(entry) : json({ error: "RecordNotFound" }, 400);
    }
    if (method === "getBlob") {
      assert.equal(url.searchParams.get("did"), did);
      return new globalThis.Response(blobs.get(url.searchParams.get("cid")));
    }
    if (method === "deleteRecord") {
      records.delete(body.rkey);
      return json({});
    }
    throw new Error(`Unexpected request: ${method}`);
  };
  const store = createPdsImageStore({
    authFetch,
    currentDid: () => current,
    collection,
    codec,
  });
  return {
    store,
    calls,
    records,
    blobs,
    authFetch,
    codec,
    setAccount: (value) => {
      current = value;
    },
  };
}

test("requires auth and a valid NSID; rejects the invalid proposal", () => {
  assert.throws(() => createPdsImageStore({}), /authFetch/);
  for (const invalid of [undefined, "app.image-board", "org.example.image-board", "-a.b.c"]) {
    assert.throws(
      () =>
        createPdsImageStore({
          authFetch() {},
          currentDid() {},
          collection: invalid,
        }),
      /Lexicon/,
    );
  }
});

test("TID creation times are deterministic and non-TID keys use a stable fallback", () => {
  const millis = Date.parse("2026-11-18T12:00:00Z");
  assert.equal(timeFromRecordKey(tid(BigInt(millis) * 1000n)), new Date(millis).toISOString());
  assert.equal(timeFromRecordKey("legacy-key"), "1970-01-01T00:00:00.000Z");
});

for (const size of [25, 40, 64]) {
  test(`PNG round trip at ${size} × ${size} uses the proposed fields`, async () => {
    const f = fixture();
    const input = drawing(size, "#123456");
    const pending = f.store.saveDraft(input);
    input.pixels[0] = "#000000";
    const saved = await pending;
    assert.equal(saved.pixels[0], "#123456");
    const value = f.records.get(saved.id).value;
    assert.deepEqual(Object.keys(value).sort(), ["$type", "height", "image", "width"]);
    assert.equal(value.width, size);
    assert.deepEqual(await f.store.loadDraft(saved.id), saved);
    assert.deepEqual(await f.store.listDrafts(), [saved]);
    assert.ok(f.calls.some((call) => call.method === "uploadBlob"));
    assert.ok(f.calls.some((call) => call.method === "getBlob"));
  });
}

test("update keeps the record key; deletion leaves other works intact", async () => {
  const f = fixture();
  const first = await f.store.saveDraft(drawing());
  const other = await f.store.saveDraft(drawing(40));
  const updated = await f.store.updateDraft(first.id, drawing(64, "#abcdef"));
  assert.equal(updated.id, first.id);
  assert.equal(f.records.size, 2);
  assert.ok(f.calls.find((call) => call.method === "putRecord").body.swapRecord);
  assert.deepEqual(await f.store.loadDraft(first.id), updated);
  assert.equal(await f.store.deleteDraft(first.id), true);
  assert.equal(await f.store.loadDraft(first.id), null);
  assert.equal(await f.store.deleteDraft(first.id), false);
  assert.deepEqual(await f.store.loadDraft(other.id), other);
});

test("four-draft limit allows updates and frees a slot after deletion", async () => {
  const f = fixture();
  for (let i = 0; i < 4; i++) await f.store.saveDraft(drawing());
  const uploads = f.blobs.size;
  await assert.rejects(f.store.saveDraft(drawing()), /up to 4/);
  assert.equal(f.blobs.size, uploads);
  const first = [...f.records.keys()][0];
  await f.store.updateDraft(first, drawing(40));
  await f.store.deleteDraft(first);
  await f.store.saveDraft(drawing(64));
  assert.equal(f.records.size, 4);
});

test("pagination reads every page and skips malformed records", async () => {
  const f = fixture({ pageSize: 1 });
  await f.store.saveDraft(drawing());
  await f.store.saveDraft(drawing(40));
  f.records.set("broken", { uri: uri("broken"), value: {} });
  const listed = await f.store.listDrafts();
  assert.equal(listed.length, 2);
  assert.ok(listed[0].id > listed[1].id);
});

test("signed-out and invalid inputs never make a network request", async () => {
  const f = fixture();
  await assert.rejects(f.store.saveDraft(drawing(30)), /size/);
  await assert.rejects(f.store.loadDraft("../other"), /Invalid/);
  f.setAccount(null);
  for (const run of [
    f.store.listDrafts,
    () => f.store.saveDraft(drawing()),
    () => f.store.loadDraft("one"),
    () => f.store.updateDraft("one", drawing()),
    () => f.store.deleteDraft("one"),
  ])
    await assert.rejects(run(), /Sign in/);
  assert.equal(f.calls.length, 0);
});

test("account changes during upload stop repository writes", async () => {
  const f = fixture({
    intercept: ({ method }) => {
      if (method === "uploadBlob") f.setAccount("did:plc:other");
    },
  });
  await assert.rejects(f.store.saveDraft(drawing()), /account changed/);
  assert.equal(f.records.size, 0);
});

test("failed uploads and record writes do not report success or retry", async () => {
  for (const failedMethod of ["uploadBlob", "createRecord"]) {
    const f = fixture({
      intercept: ({ method }) =>
        method === failedMethod ? json({ error: "Unavailable" }, 503) : null,
    });
    await assert.rejects(f.store.saveDraft(drawing()), /HTTP 503/);
    assert.equal(f.records.size, 0);
    assert.equal(f.calls.filter((call) => call.method === failedMethod).length, 1);
  }
});

test("permissions, rate limits and unreadable responses have readable errors", async () => {
  for (const [status, pattern] of [
    [403, /denied/],
    [429, /limit/],
    [500, /HTTP 500/],
  ]) {
    const f = fixture({ intercept: () => json({ error: "Failure" }, status) });
    await assert.rejects(f.store.listDrafts(), pattern);
  }
  const f = fixture({ intercept: () => new globalThis.Response("not JSON") });
  await assert.rejects(f.store.listDrafts(), /unreadable/);
});

test("missing updates reject; BlobNotFound is a loading failure", async () => {
  const f = fixture({
    intercept: ({ method }) => (method === "getBlob" ? json({ error: "BlobNotFound" }, 404) : null),
  });
  await assert.rejects(f.store.updateDraft("missing", drawing()), /no longer exists/);
  const saved = await f.store.saveDraft(drawing());
  await assert.rejects(f.store.loadDraft(saved.id), /HTTP 404/);
});

test("repeated pagination cursors and wrong-record responses reject", async () => {
  const repeated = fixture({ intercept: () => json({ records: [], cursor: "same" }) });
  await assert.rejects(repeated.store.listDrafts(), /pagination/);
  const wrong = fixture({ intercept: () => json({ uri: uri("other"), value: {} }) });
  await assert.rejects(wrong.store.loadDraft("one"), /different drawing/);
});

test("stale updates reject without overwriting changed work", async () => {
  const f = fixture({
    intercept: ({ method }) =>
      method === "putRecord" ? json({ error: "InvalidSwap" }, 400) : null,
  });
  const saved = await f.store.saveDraft(drawing());
  await assert.rejects(f.store.updateDraft(saved.id, drawing(40)), /Reload before saving/);
  assert.equal(f.records.get(saved.id).value.width, 25);
});
