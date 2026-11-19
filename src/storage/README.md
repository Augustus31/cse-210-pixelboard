# Save / Load module

This directory contains an independent PNG-backed PDS storage implementation.
It does not change the editor's login, buttons, storage defaults, or page layout.
Frontend, OAuth, and Lexicon implementations are not included in this branch.

## Submission scope

- `authenticatedPdsStore.js`: connect to Miguel's real OAuth helpers after initialization.
- `pdsImageStore.js`: upload PNG Blobs, create/list/load/update/delete repository records.
- `pngCodec.js`: convert editor pixels to a native-resolution PNG and back.
- `pdsImageStore.test.js` and `pngCodec.test.js`: storage and codec unit tests.
- `tests/browser/png-roundtrip.html`: real browser PNG round-trip checks.

There is no local PDS simulator or automatic local/cloud mode selection in the
application. The earlier localPdsPreview.js and JSON adapter were removed.
The drawing page and local draft UI belong to the frontend branch. This branch
contains only storage code and its tests; it does not provide a standalone editor.

## Required integration contract

The OAuth branch now exports `initAuth()`, `currentDid()`, and `authFetch(path, init)`.
That implementation remains on the OAuth team's branch and is not copied here.
Save/Load consumes those exports through the connection module below. It does not
implement login, read tokens, or fall back to a simulated session or browser store.

```js
import { createAuthenticatedPdsStore } from './storage/authenticatedPdsStore.js';

// collection must come from the agreed Lexicon configuration.
// Use the actual OAuth module path in the integrating application.
const store = await createAuthenticatedPdsStore(
  { collection },
  () => import('../../auth.js'),
);
const drawings = await store.listDrafts();
```

The connection awaits OAuth initialization before returning the storage API.
An unsigned user can initialize the connection, but storage operations reject until
signed in. Each operation reads the current DID again, including after sign-out.
OAuth initialization failures propagate to the caller.
The frontend's drafts API is not switched to PDS yet: the collection NSID and
schema constraints still need agreement with the Lexicon team.

## API

| Function | Behavior |
| --- | --- |
| `saveDraft({size, pixels})` | Creates a new record; rejects after four drafts by default |
| `listDrafts()` | Reads every page, downloads PNGs, and returns editable drawings |
| `loadDraft(id)` | Returns one drawing, or null for an explicitly missing record |
| `deleteDraft(id)` | Deletes the selected record; false if already missing |
| `updateDraft(id, {size, pixels})` | Updates the same record key without another draft slot |

Results use the frontend's `{id, size, pixels, savedAt}` shape. The editor supports
square sizes 25, 40 and 64. PNG decoding flattens transparency onto white.
The client currently limits images to 1,000,000 bytes; the Blob size limit still
needs agreement with the Lexicon group. maxDrafts and maxBlobBytes are configurable.

## Record format and outstanding decisions

The implementation follows the proposed whole-drawing PNG shape:

```js
{
  $type: collection,
  image: { $type: 'blob', ref: { $link: '...' }, mimeType: 'image/png', size: 123 },
  width: 25,
  height: 25,
}
```

The proposal's current `app.image-board` is not a valid NSID. No replacement name
is guessed by this module. Configuration rejects invalid collection names.

The proposal has no timestamp fields. savedAt therefore uses the TID record key's
creation time; updating a drawing keeps that creation time. Non-TID legacy keys
use the epoch as a stable fallback. Agree createdAt/updatedAt before promising
persistent last-edited dates or modification-time sorting.

Upload and record creation are separate requests. A successful Blob upload alone
is not reported as a saved work. Updates compare CIDs where available. Account
identity is checked around requests, and writes are not retried automatically.
Repository records and images are public; this module does not promise private storage.

## Validation and current limits

```sh
npm run lint
npm test
```

Storage unit tests use an in-memory transport to test the API without credentials
or remote writes. These test doubles are confined to tests and are not selected
by the application at runtime. The browser test uses actual native PNG encoding
and decoding with exact pixel comparisons for all three canvas sizes.

To run the browser-only codec check from the repository root:

```sh
python3 -m http.server 5175 --bind 127.0.0.1
```

Open http://127.0.0.1:5175/tests/browser/png-roundtrip.html.
No frontend application or build step is required.

Live PDS integration is not complete. It still requires a
valid collection NSID, an explicit frontend integration, and a real-account test
covering save, reload, edit, update and deletion. The frontend must also decide
whether Save draft creates snapshots or a separate action updates existing works.
