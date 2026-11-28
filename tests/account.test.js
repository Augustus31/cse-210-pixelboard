import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanHandle, isHandleUsable, accountLabel } from '../src/Oauth/account.js';

test('cleanHandle: removes spaces at the start and end', () => {
  assert.equal(cleanHandle('  alice.bsky.social  '), 'alice.bsky.social');
});

test('cleanHandle: removes one leading @', () => {
  assert.equal(cleanHandle('@alice.bsky.social'), 'alice.bsky.social');
  assert.equal(cleanHandle('  @alice.bsky.social '), 'alice.bsky.social');
});

test('cleanHandle: removes only one @', () => {
  assert.equal(cleanHandle('@@alice.bsky.social'), '@alice.bsky.social');
});

test('cleanHandle: keeps a handle that is already clean', () => {
  assert.equal(cleanHandle('alice.bsky.social'), 'alice.bsky.social');
});

test('isHandleUsable: empty text is not usable', () => {
  assert.equal(isHandleUsable(''), false);
  assert.equal(isHandleUsable('@'), false);
});

test('isHandleUsable: only spaces is not usable', () => {
  assert.equal(isHandleUsable('   '), false);
});

test('isHandleUsable: a space inside is not usable', () => {
  assert.equal(isHandleUsable('alice bsky.social'), false);
});

test('isHandleUsable: a normal handle is usable, with or without @ and outer spaces', () => {
  assert.equal(isHandleUsable('alice.bsky.social'), true);
  assert.equal(isHandleUsable(' @alice.bsky.social '), true);
});

test('accountLabel: shows @ + handle when the handle exists', () => {
  assert.equal(accountLabel({ did: 'did:plc:abc123', handle: 'alice.bsky.social' }), '@alice.bsky.social');
});

test('accountLabel: without a handle, a long DID is cut to 16 characters + …', () => {
  assert.equal(accountLabel({ did: 'did:plc:abc12345xyz67890' }), 'did:plc:abc12345…');
});

test('accountLabel: without a handle, a DID of 16 characters or less is shown in full', () => {
  assert.equal(accountLabel({ did: 'did:plc:abc12345' }), 'did:plc:abc12345');
  assert.equal(accountLabel({ did: 'did:plc:abc' }), 'did:plc:abc');
});

test('accountLabel: an empty handle uses the DID', () => {
  assert.equal(accountLabel({ did: 'did:plc:abc', handle: '' }), 'did:plc:abc');
});
