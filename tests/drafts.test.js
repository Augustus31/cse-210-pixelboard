import test from 'node:test';
import assert from 'node:assert/strict';
import { DRAFTS_KEY, MAX_DRAFTS, createDraftStore, saveDraft, listDrafts, loadDraft, deleteDraft } from '../src/drafts.js';

// A fake localStorage. maxCharacters makes setItem fail like a full browser storage.
function fakeStorage({ maxCharacters = Infinity, initial = {} } = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem(key, value) {
      if (String(value).length > maxCharacters) {
        const error = new Error('The quota has been exceeded.');
        error.name = 'QuotaExceededError';
        throw error;
      }
      data[key] = String(value);
    },
  };
}

// A clock that moves forward one minute each call, so each draft has a different time.
function fakeClock(start = '2026-11-15T10:00:00.000Z') {
  let time = Date.parse(start);
  return () => { const date = new Date(time); time += 60_000; return date; };
}

const blankPixels = (size, color = '#ffffff') => Array(size * size).fill(color);
const newStore = (options = {}) => {
  let counter = 0;
  return createDraftStore({ storage: fakeStorage(), now: fakeClock(), createId: () => `id-${++counter}`, ...options });
};

test('the drafts key is separate from the auto-save key', () => {
  assert.equal(DRAFTS_KEY, 'pixelboard-drafts-v1');
  assert.notEqual(DRAFTS_KEY, 'pixelboard-v1');
});

test('the module exports the async API functions', () => {
  for (const apiFunction of [saveDraft, listDrafts, loadDraft, deleteDraft]) assert.equal(apiFunction.constructor.name, 'AsyncFunction');
});

test('saveDraft resolves to the new draft with id, size, pixels, and an ISO time', async () => {
  const store = newStore();
  const pixels = blankPixels(25, '#123456');
  const draft = await store.saveDraft({ size: 25, pixels });
  assert.deepEqual(draft, { id: 'id-1', size: 25, pixels, savedAt: '2026-11-15T10:00:00.000Z' });
});

test('save then list gives the saved draft', async () => {
  const store = newStore();
  const saved = await store.saveDraft({ size: 40, pixels: blankPixels(40) });
  assert.deepEqual(await store.listDrafts(), [saved]);
});

test('listDrafts gives the newest draft first', async () => {
  const store = newStore();
  await store.saveDraft({ size: 25, pixels: blankPixels(25) });
  await store.saveDraft({ size: 40, pixels: blankPixels(40) });
  await store.saveDraft({ size: 64, pixels: blankPixels(64) });
  assert.deepEqual((await store.listDrafts()).map((draft) => draft.id), ['id-3', 'id-2', 'id-1']);
});

test('listDrafts gives an empty list when nothing is saved', async () => {
  assert.deepEqual(await newStore().listDrafts(), []);
});

test('loadDraft finds a draft by id', async () => {
  const store = newStore();
  await store.saveDraft({ size: 25, pixels: blankPixels(25, '#000000') });
  const second = await store.saveDraft({ size: 25, pixels: blankPixels(25, '#ff0000') });
  assert.deepEqual(await store.loadDraft(second.id), second);
});

test('loadDraft gives null for an unknown id', async () => {
  const store = newStore();
  await store.saveDraft({ size: 25, pixels: blankPixels(25) });
  assert.equal(await store.loadDraft('no-such-id'), null);
});

test('a saved draft does not change when the source pixels change later', async () => {
  const store = newStore();
  const pixels = blankPixels(25);
  const saved = await store.saveDraft({ size: 25, pixels });
  pixels[0] = '#000000';
  assert.equal(saved.pixels[0], '#ffffff');
  assert.equal((await store.loadDraft(saved.id)).pixels[0], '#ffffff');
});

test('changing a returned draft does not change the stored draft', async () => {
  const store = newStore();
  const saved = await store.saveDraft({ size: 25, pixels: blankPixels(25) });
  (await store.listDrafts())[0].pixels[0] = '#000000';
  assert.equal((await store.loadDraft(saved.id)).pixels[0], '#ffffff');
});

test('saving does not touch other keys, such as the auto-save', async () => {
  const storage = fakeStorage({ initial: { 'pixelboard-v1': 'teammate data' } });
  await newStore({ storage }).saveDraft({ size: 25, pixels: blankPixels(25) });
  assert.equal(storage.data['pixelboard-v1'], 'teammate data');
});

test('a full storage makes saveDraft reject with a readable message, and the list does not change', async () => {
  const storage = fakeStorage({ maxCharacters: 25 * 25 * 12 });
  const store = newStore({ storage });
  await store.saveDraft({ size: 25, pixels: blankPixels(25) });
  await assert.rejects(store.saveDraft({ size: 64, pixels: blankPixels(64) }), (error) => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /storage is full/i);
    return true;
  });
  assert.equal((await store.listDrafts()).length, 1);
});

test('missing storage makes every function reject with a readable message', async () => {
  const store = newStore({ storage: null });
  for (const call of [() => store.saveDraft({ size: 25, pixels: blankPixels(25) }), () => store.listDrafts(), () => store.loadDraft('x'), () => store.deleteDraft('x')]) {
    await assert.rejects(call(), /storage is not available/i);
  }
});

test('a storage that fails on read makes listDrafts reject with a readable message', async () => {
  const blockedStorage = { getItem() { throw new Error('The operation is insecure.'); }, setItem() {} };
  await assert.rejects(newStore({ storage: blockedStorage }).listDrafts(), /could not read the drafts: the operation is insecure/i);
});

test('saved text that is not JSON gives an empty list', async () => {
  const store = newStore({ storage: fakeStorage({ initial: { [DRAFTS_KEY]: '{broken' } }) });
  assert.deepEqual(await store.listDrafts(), []);
});

test('saveDraft rejects a canvas with a wrong size or wrong pixel data', async () => {
  const store = newStore();
  await assert.rejects(store.saveDraft({ size: 30, pixels: blankPixels(30) }), /size/i);
  await assert.rejects(store.saveDraft({ size: 25, pixels: blankPixels(24) }), /pixels/i);
  await assert.rejects(store.saveDraft({ size: 25, pixels: [...blankPixels(25).slice(1), 'red'] }), /pixels/i);
});

test('broken saved data is skipped instead of breaking the list', async () => {
  const good = { id: 'ok', size: 25, pixels: blankPixels(25), savedAt: '2026-11-15T09:00:00.000Z' };
  const saved = JSON.stringify([good, { id: 'bad', size: 25, pixels: [] }, 'nonsense']);
  const store = newStore({ storage: fakeStorage({ initial: { [DRAFTS_KEY]: saved } }) });
  assert.deepEqual(await store.listDrafts(), [good]);
});

test('each saved draft gets a different id by default', async () => {
  const store = createDraftStore({ storage: fakeStorage() });
  const first = await store.saveDraft({ size: 25, pixels: blankPixels(25) });
  const second = await store.saveDraft({ size: 25, pixels: blankPixels(25) });
  assert.notEqual(first.id, second.id);
});


test('deleteDraft removes only the requested snapshot and persists across store instances', async () => {
  const storage = fakeStorage({ initial: { 'pixelboard-v1': 'current drawing' } });
  const store = newStore({ storage });
  const first = await store.saveDraft({ size: 25, pixels: blankPixels(25) });
  const second = await store.saveDraft({ size: 40, pixels: blankPixels(40, '#123456') });
  assert.equal(await store.deleteDraft(first.id), true);
  const reopened = newStore({ storage });
  assert.equal(await reopened.loadDraft(first.id), null);
  assert.deepEqual(await reopened.listDrafts(), [second]);
  assert.equal(storage.data['pixelboard-v1'], 'current drawing');
});

test('deleting the final draft leaves an empty list; repeating deletion returns false', async () => {
  const store = newStore();
  const draft = await store.saveDraft({ size: 25, pixels: blankPixels(25) });
  assert.equal(await store.deleteDraft(draft.id), true);
  assert.deepEqual(await store.listDrafts(), []);
  assert.equal(await store.deleteDraft(draft.id), false);
});

test('deleting an unknown id does not rewrite storage', async () => {
  const storage = fakeStorage();
  const store = newStore({ storage });
  await store.saveDraft({ size: 25, pixels: blankPixels(25) });
  storage.setItem = () => { throw new Error('Unexpected write'); };
  assert.equal(await store.deleteDraft('missing'), false);
});

test('delete failure reports an error and keeps the saved draft', async () => {
  const storage = fakeStorage();
  const store = newStore({ storage });
  const draft = await store.saveDraft({ size: 25, pixels: blankPixels(25) });
  storage.setItem = () => { throw new Error('Storage blocked'); };
  await assert.rejects(store.deleteDraft(draft.id), /could not delete the draft: storage blocked/i);
  assert.deepEqual(await store.loadDraft(draft.id), draft);
});

test('deleteDraft reports a read failure rather than discarding saved data', async () => {
  const storage = { getItem() { throw new Error('Read blocked'); } };
  await assert.rejects(newStore({ storage }).deleteDraft('x'), /could not read the drafts/i);
});


test('draft limit allows four saves, rejects a fifth without altering storage, and frees a slot on delete', async () => {
  assert.equal(MAX_DRAFTS, 4);
  const storage = fakeStorage();
  const store = newStore({ storage });
  const saved = [];
  for (let i = 0; i < MAX_DRAFTS; i++) saved.push(await store.saveDraft({ size: 25, pixels: blankPixels(25) }));
  const before = storage.data[DRAFTS_KEY];
  // Another instance also sees the persisted limit.
  await assert.rejects(newStore({ storage }).saveDraft({ size: 40, pixels: blankPixels(40) }), /up to 4 drafts.*delete/i);
  assert.equal(storage.data[DRAFTS_KEY], before);
  await store.deleteDraft(saved[0].id);
  await store.saveDraft({ size: 64, pixels: blankPixels(64) });
  assert.equal((await store.listDrafts()).length, 4);
});

test('existing drafts above the limit stay accessible but cannot be added to', async () => {
  const drafts = Array.from({ length: 5 }, (_, i) => ({ id: `old-${i}`, size: 25, pixels: blankPixels(25), savedAt: '2026-11-15T09:00:00.000Z' }));
  const store = newStore({ storage: fakeStorage({ initial: { [DRAFTS_KEY]: JSON.stringify(drafts) } }) });
  await assert.rejects(store.saveDraft({ size: 25, pixels: blankPixels(25) }), /up to 4 drafts/i);
  assert.equal((await store.listDrafts()).length, 5);
  assert.deepEqual(await store.loadDraft('old-0'), drafts[0]);
});
