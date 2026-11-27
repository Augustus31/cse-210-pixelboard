import test from "node:test";
import assert from "node:assert/strict";
import { createAuthenticatedPdsStore } from "../src/storage/authenticatedPdsStore.js";

test("the integrating application must provide its OAuth module loader", async () => {
  await assert.rejects(
    createAuthenticatedPdsStore({ collection: "cloud.pixelboard.imageBoard" }),
    /Provide the OAuth module loader/,
  );
});

test("OAuth initializes before storage sends authenticated requests", async () => {
  const calls = [];
  let did = null;
  const auth = {
    async initAuth() {
      calls.push("init");
      did = "did:plc:owner";
    },
    currentDid: () => did,
    async authFetch(path, init) {
      calls.push("fetch");
      const url = new globalThis.URL(path, "https://pds.example");
      assert.equal(url.pathname, "/xrpc/com.atproto.repo.listRecords");
      assert.equal(url.searchParams.get("repo"), did);
      assert.equal(url.searchParams.get("collection"), "cloud.pixelboard.imageBoard");
      assert.equal(init.method, "GET");
      return new globalThis.Response(JSON.stringify({ records: [] }));
    },
  };
  const store = await createAuthenticatedPdsStore(
    { collection: "cloud.pixelboard.imageBoard" }, () => auth,
  );
  assert.deepEqual(await store.listDrafts(), []);
  assert.deepEqual(calls, ["init", "fetch"]);
  did = null;
  await assert.rejects(store.listDrafts(), /Sign in/);
  assert.deepEqual(calls, ["init", "fetch"]);
});

test("OAuth initialization failures propagate without a local storage fallback", async () => {
  const failure = new Error("OAuth initialization failed");
  await assert.rejects(
    createAuthenticatedPdsStore({ collection: "cloud.pixelboard.imageBoard" }, () => ({
      initAuth: async () => { throw failure; },
    })),
    (error) => error === failure,
  );
});

test("the connection requires a valid collection instead of guessing a namespace", async () => {
  const auth = {
    initAuth: async () => null,
    currentDid: () => null,
    authFetch: async () => { throw new Error("Unexpected network request"); },
  };
  await assert.rejects(
    createAuthenticatedPdsStore({ collection: "app.image-board" }, () => auth),
    /Lexicon collection/,
  );
});
