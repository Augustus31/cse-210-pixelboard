/**
 * The account area at the right end of the header: the Log in button with its
 * handle popover, or the user name with a Log out button.
 * It uses only the auth contract (initAuth, signIn, signOut, event auth-ended),
 * so it does not depend on how `oauthClient.js` does the login.
 * @module Oauth/UI/accountMenuUI
 */
import { cleanHandle, isHandleUsable, accountLabel } from '../account.js';

const EMPTY_HANDLE_MESSAGE = 'Type your handle, for example you.bsky.social.';
const BUSY_MESSAGE = 'Opening your sign-in page…';
const SESSION_ENDED_MESSAGE = 'Your session ended. Log in again to continue.';

/**
 * Connects the header account elements to the auth functions.
 * The auth functions are parameters, so tests can give their own.
 * @param {Object} options
 * @param {() => Promise<{did: string, handle?: string}|null>} options.initAuth - Resolves to the logged-in user, or null
 * @param {(handle: string) => Promise<void>} options.signIn - Starts login (the real module leaves the page)
 * @param {() => Promise<void>} options.signOut - Ends the session
 * @param {(message: string) => void} options.showStatus - Shows a message in the page status line
 * @param {EventTarget} [options.eventTarget] - Fires `auth-ended` (the browser `window` by default)
 */
export function createAccountMenu({ initAuth, signIn, signOut, showStatus, eventTarget = window }) {
  const loginButton = document.getElementById('login-button');
  const popover = document.getElementById('login-popover');
  const handleInput = document.getElementById('login-handle');
  const continueButton = document.getElementById('login-continue');
  const loginMessage = document.getElementById('login-message');
  const userArea = document.getElementById('account-user');
  const userName = document.getElementById('account-name');
  const logoutButton = document.getElementById('logout-button');
  let busy = false;

  const isPopoverOpen = () => !popover.hidden;

  function setBusy(isBusy) {
    busy = isBusy;
    handleInput.disabled = isBusy;
    continueButton.disabled = isBusy;
  }

  function openPopover() {
    popover.hidden = false;
    loginButton.setAttribute('aria-expanded', 'true');
    handleInput.focus();
  }

  // Closing clears the error but keeps the typed handle, so the user can fix a typo.
  function closePopover() {
    popover.hidden = true;
    loginButton.setAttribute('aria-expanded', 'false');
    loginMessage.textContent = '';
  }

  function showLoggedOut() {
    closePopover();
    setBusy(false);
    userArea.hidden = true;
    loginButton.hidden = false;
    loginButton.disabled = false;
  }

  function showLoggedIn(user) {
    const focusWasInPopover = popover.contains(document.activeElement);
    closePopover();
    setBusy(false);
    loginButton.hidden = true;
    userName.textContent = accountLabel(user);
    userName.title = user.did;
    userArea.hidden = false;
    // The focused input is now hidden; keep keyboard users in the account area.
    if (focusWasInPopover) logoutButton.focus();
  }

  async function submitHandle() {
    const handle = cleanHandle(handleInput.value);
    if (!isHandleUsable(handle)) {
      loginMessage.textContent = EMPTY_HANDLE_MESSAGE;
      return;
    }
    setBusy(true);
    loginMessage.textContent = BUSY_MESSAGE;
    try {
      await signIn(handle);
      setBusy(false);
    } catch (error) {
      setBusy(false);
      loginMessage.textContent = `Could not start login: ${error.message}`;
      handleInput.focus();
    }
  }

  // The local session is gone even when signOut fails, so the header always shows Logged out.
  async function logOut() {
    logoutButton.disabled = true;
    try {
      await signOut();
      showStatus('Logged out.');
    } catch (error) {
      showStatus(error.message);
    } finally {
      logoutButton.disabled = false;
      showLoggedOut();
      loginButton.focus();
    }
  }

  // While busy, the popover stays open so the user sees that login is in progress.
  function closeFromOutside() {
    if (!isPopoverOpen() || busy) return false;
    closePopover();
    return true;
  }

  loginButton.addEventListener('click', () => {
    if (!isPopoverOpen()) openPopover();
    else closeFromOutside();
  });
  popover.addEventListener('submit', (event) => {
    event.preventDefault();
    submitHandle();
  });
  logoutButton.addEventListener('click', logOut);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && closeFromOutside()) loginButton.focus();
  });
  document.addEventListener('pointerdown', (event) => {
    if (popover.contains(event.target) || loginButton.contains(event.target)) return;
    closeFromOutside();
  });

  eventTarget.addEventListener('auth-ended', () => {
    showLoggedOut();
    showStatus(SESSION_ENDED_MESSAGE);
  });

  // Checking state: the Log in button is disabled in the HTML until initAuth finishes.
  initAuth().then(
    (user) => (user ? showLoggedIn(user) : showLoggedOut()),
    (error) => {
      showLoggedOut();
      showStatus(`Login failed: ${error.message}`);
    },
  );
}
