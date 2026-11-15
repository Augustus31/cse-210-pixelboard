/**
 * Opens a <dialog> with showModal() and waits for the user's answer.
 * Each button in the dialog's <form method="dialog"> has a value; that value is the answer.
 * Esc closes the dialog with no value, which counts as 'cancel'.
 * @param {HTMLDialogElement} dialog
 * @returns {Promise<string>} The value of the clicked button, or 'cancel'
 */
export function askWithDialog(dialog) {
  return new Promise((resolve) => {
    dialog.returnValue = '';
    dialog.addEventListener('close', () => resolve(dialog.returnValue || 'cancel'), { once: true });
    dialog.showModal();
  });
}
