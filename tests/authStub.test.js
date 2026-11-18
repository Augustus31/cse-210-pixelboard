import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthStub } from '../src/authStub.js';

// Each test gets its own stub and event target, so tests do not share a session.
const newStub = () => {
  const eventTarget = new EventTarget();
  const stub = createAuthStub({ eventTarget, delayMs: 0 });
  return { stub, eventTarget };
};

test('initAuth: resolves to null at page open (logged out)', async () => {
  const { stub } = newStub();
  assert.equal(await stub.initAuth(), null);
});

test('initAuth: later calls give the same Promise', () => {
  const { stub } = newStub();
  assert.equal(stub.initAuth(), stub.initAuth());
});

test('signIn: rejects if initAuth was not called first', async () => {
  const { stub } = newStub();
  await assert.rejects(stub.signIn('alice.bsky.social'), /initAuth/);
});

test('signIn: stores the user with the handle and a fake DID', async () => {
  const { stub } = newStub();
  await stub.initAuth();
  await stub.signIn('alice.bsky.social');
  assert.deepEqual(stub.getUser(), { did: 'did:example:alice.bsky.social', handle: 'alice.bsky.social' });
});

test('signIn: cleans the handle like the real module (spaces and leading @)', async () => {
  const { stub } = newStub();
  await stub.initAuth();
  await stub.signIn('  @alice.bsky.social ');
  assert.equal(stub.getUser().handle, 'alice.bsky.social');
});

test('signIn: fires auth-changed with the user in event.detail', async () => {
  const { stub, eventTarget } = newStub();
  let changedUser;
  eventTarget.addEventListener('auth-changed', (event) => { changedUser = event.detail; });
  await stub.initAuth();
  await stub.signIn('alice.bsky.social');
  assert.deepEqual(changedUser, stub.getUser());
});

test('signIn: the test handle fail.test rejects with a readable message', async () => {
  const { stub } = newStub();
  await stub.initAuth();
  await assert.rejects(stub.signIn('fail.test'), (error) => error instanceof Error && error.message.length > 0);
  assert.equal(stub.getUser(), null);
});

test('signOut: clears the user', async () => {
  const { stub } = newStub();
  await stub.initAuth();
  await stub.signIn('alice.bsky.social');
  await stub.signOut();
  assert.equal(stub.getUser(), null);
});

test('getUser gives a copy, so a caller cannot change the session', async () => {
  const { stub } = newStub();
  await stub.initAuth();
  await stub.signIn('alice.bsky.social');
  stub.getUser().handle = 'mallory.test';
  assert.equal(stub.getUser().handle, 'alice.bsky.social');
});
