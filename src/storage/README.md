# Save / Load integration

Save/Load uses the merged Lexicon functions in `lexicons/board-convert.js` for
PNG conversion and `saveBoard`, `loadBoard`, and `updateBoard`. Authentication
continues to use Miguel's unchanged `initAuth`, `currentDid`, and `authFetch`.

## Files and responsibilities

- `oauthAgent.js`: adapts those OAuth helpers to the Agent methods used by Lexicon.
  It does not create another session, read tokens, or add an SDK dependency.
- `pdsImageStore.js`: supplies the frontend drafts contract, pagination, deletion,
  snapshot limits, saved-time sorting, and AT URI/CID results.
- `authenticatedPdsStore.js`: initializes OAuth and creates the store.
- `recordTime.js`: reads creation times from legacy TID keys.
- `pngCodec.js`: the earlier standalone codec and its regression checks. The current
  PDS save/load path delegates PNG conversion to the shared Lexicon implementation.

## Connecting the frontend

The frontend owner is currently integrating real login. When that integration is
ready, the drafts API can delegate to this store without changing drawing tools
or the page layout. Use the actual path to Miguel's module in that application:

```js
import { createAuthenticatedPdsStore } from './storage/authenticatedPdsStore.js';

const store = await createAuthenticatedPdsStore(
  {},
  () => import('../auth.js'),
);
const saved = await store.saveDraft({ size, pixels });
// saved.uri is the AT URI expected as boardLink by POST /api/submit.
```

`saveDraft`, `listDrafts`, `loadDraft`, `updateDraft`, and `deleteDraft` are async.
Drawings have `{id, size, pixels, savedAt, uri, cid}`. Save creates a new snapshot;
update replaces the same record key. The default four-snapshot limit follows the
current frontend. A deleted record returns null on load and false on deletion.
The store never silently falls back to browser storage or fake authentication.

The backend's `POST /api/submit` currently accepts `{boardLink: saved.uri}`.
Saving a drawing does not automatically submit it for a match. Backend pairing,
bot posting, match persistence, and themes remain with the backend team.

## Agreed schema and constraints

Collection: `cloud.pixelboard.imageBoard`. Records contain a PNG `image` Blob,
`width`, and `height`. Storage accepts square dimensions from 1 to 512; the current
editor only offers 25, 40, and 64. Do not change its size menu to expose other sizes
without coordinating with the frontend owner.

Following Sumukh's November 24 response, optional datetime fields are added to the
schema: `createdAt` is preserved on updates, and `updatedAt` changes on each save.
Older records without timestamps remain readable using their TID creation time.
The PDS record's `$type` is filled by the adapter and matches the collection.

There is no additional fixed PNG byte limit or schema `maxSize`. PDS upload errors
remain visible to callers. A dimension limit is not a guarantee about every PDS's
configuration or every encoded PNG's byte length. Updates/deletes use swapRecord
where a CID is available. Requests verify the account before and after network
operations, and failed writes are not retried automatically.

## Verification and remaining integration

```sh
npm run lint
npm test
```

Node tests use simulated PDS responses and canvas primitives. The standalone
browser test pages were removed from the submitted branch; they are not required
by the application. Browser and real-account checks can run in a separate local
integration checkout.

Real-account end-to-end verification is still pending. Coordinate the final drafts
entry point and auth initialization with the frontend owner, then test save,
refresh, load, edit, update, delete, logout, and backend handoff with a real account.
No frontend feature branch or backend implementation is merged into this branch;
the base update contains only dependencies already merged into main.
