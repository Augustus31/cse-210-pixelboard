/**
 * The drafts column (Spec 1, sections 4.5.3 to 4.5.6): the "Save draft" button, the list of
 * drafts with thumbnails, the two-step load, and the unsaved-work warning.
 * It talks to storage only through the drafts API, so the save/export group can change the
 * storage without changes here.
 * @module draftsColumn
 */
import { saveDraft, listDrafts, loadDraft, deleteDraft, MAX_DRAFTS } from './drafts.js';
import { pixelsToRgba, formatSavedAt, nextDraftSelection } from './draftDisplay.js';
import { snapshotCanvas, hasUnsavedChanges } from './unsaved.js';
import { askWithDialog } from './dialogs.js';

function drawThumbnail({ size, pixels }) {
  const thumbnail = document.createElement('canvas');
  thumbnail.className = 'draft-thumb';
  thumbnail.width = thumbnail.height = size;
  thumbnail.getContext('2d').putImageData(new ImageData(pixelsToRgba(pixels), size, size), 0, 0);
  return thumbnail;
}

function createDraftItem(draft, onClick, onDelete) {
  const item = document.createElement('li');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'draft-item';
  button.dataset.id = draft.id;
  const sizeText = `${draft.size} × ${draft.size}`;
  const timeText = formatSavedAt(draft.savedAt);
  button.setAttribute('aria-label', `Draft ${sizeText}, saved ${timeText}. Click two times to load.`);
  button.title = 'Click again to load this draft';
  const sizeLabel = document.createElement('span');
  sizeLabel.className = 'draft-size';
  sizeLabel.textContent = sizeText;
  const time = document.createElement('time');
  time.dateTime = draft.savedAt;
  time.textContent = timeText;
  button.append(drawThumbnail(draft), sizeLabel, time);
  button.addEventListener('click', () => onClick(draft.id));
  // A sibling button keeps deleting separate from selecting/loading a draft.
  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'draft-delete';
  deleteButton.textContent = 'Delete';
  deleteButton.setAttribute('aria-label', `Delete draft ${sizeText}, saved ${timeText}`);
  deleteButton.addEventListener('click', async () => {
    deleteButton.disabled = true;
    try { await onDelete(draft.id); }
    finally { deleteButton.disabled = false; }
  });
  item.append(button, deleteButton);
  return item;
}

/**
 * Connects the drafts column to the canvas.
 * @param {Object} options
 * @param {() => {size: number, pixels: string[]}} options.getCanvas - Gives a copy of the current canvas
 * @param {(draft: {size: number, pixels: string[]}) => void} options.applyDraft - Puts a draft on the canvas as one undo step
 * @param {(message: string) => void} options.showStatus - Shows a short message in the page footer
 */
export function createDraftsColumn({ getCanvas, applyDraft, showStatus }) {
  const listElement = document.getElementById('draft-list');
  const emptyHint = document.getElementById('drafts-empty');
  const saveButton = document.getElementById('save-draft');
  const loadDialog = document.getElementById('load-dialog');
  const unsavedDialog = document.getElementById('unsaved-dialog');
  let drafts = [];
  let selectedId = null;
  let baselineDraftId = null;
  let baseline = null; // null = blank canvas at page open (Spec 4.5.6).

  function showSelection() {
    listElement.querySelectorAll('.draft-item').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.id === selectedId));
    });
  }

  function showDrafts() {
    listElement.replaceChildren(...drafts.map((draft) => createDraftItem(draft, onDraftClick, onDraftDelete)));
    emptyHint.hidden = drafts.length > 0;
    saveButton.disabled = drafts.length >= MAX_DRAFTS;
    saveButton.textContent = `Save draft (${drafts.length}/${MAX_DRAFTS})`;
    saveButton.title = drafts.length >= MAX_DRAFTS ? 'Delete a draft before saving another.' : 'Save the current canvas as a draft';
    document.getElementById('draft-limit').textContent = drafts.length >= MAX_DRAFTS ? 'Draft limit reached. Delete a draft to save another.' : '';
    showSelection();
  }

  // Change the list only after storage succeeds; the current canvas stays untouched.
  async function onDraftDelete(id) {
    try {
      const removed = await deleteDraft(id);
      drafts = drafts.filter((draft) => draft.id !== id);
      if (selectedId === id) selectedId = null;
      // A deleted snapshot can no longer count as a saved copy of the current work.
      if (baselineDraftId === id) {
        baseline = null;
        baselineDraftId = null;
      }
      showDrafts();
      showStatus(removed ? 'Draft deleted.' : 'This draft no longer exists.');
    } catch (error) {
      showStatus(error.message);
    }
  }

  // Returns true on success, so "Save, then load" can stop when the save fails.
  async function saveCurrentCanvas() {
    saveButton.disabled = true;
    try {
      const draft = await saveDraft(getCanvas());
      drafts = [draft, ...drafts];
      baseline = snapshotCanvas(draft);
      baselineDraftId = draft.id;
      showDrafts();
      showStatus(`Draft saved (${draft.size} × ${draft.size}).`);
      return true;
    } catch (error) {
      showStatus(error.message);
      return false;
    } finally {
      saveButton.disabled = drafts.length >= MAX_DRAFTS;
    }
  }

  async function loadIntoCanvas(id) {
    try {
      const draft = await loadDraft(id);
      if (draft === null) {
        showStatus('This draft no longer exists.');
        return;
      }
      applyDraft(draft);
      baseline = snapshotCanvas(draft);
      baselineDraftId = draft.id;
      showStatus(`Draft loaded (${draft.size} × ${draft.size}). Press Ctrl+Z to go back.`);
    } catch (error) {
      showStatus(error.message);
    }
  }

  // Returns false when the user cancels, or when "Save, then load" could not save.
  async function confirmUnsavedWork() {
    if (!hasUnsavedChanges(getCanvas(), baseline)) return true;
    const choice = await askWithDialog(unsavedDialog);
    if (choice === 'save') return saveCurrentCanvas();
    return choice === 'discard';
  }

  async function onDraftClick(id) {
    const step = nextDraftSelection(selectedId, id);
    selectedId = step.selectedId;
    showSelection();
    if (!step.askToLoad) return;
    if (await askWithDialog(loadDialog) !== 'load') return;
    if (!(await confirmUnsavedWork())) return;
    await loadIntoCanvas(id);
  }

  saveButton.addEventListener('click', saveCurrentCanvas);
  listDrafts()
    .then((savedDrafts) => { drafts = savedDrafts; })
    .catch((error) => showStatus(error.message))
    .finally(showDrafts);
}
