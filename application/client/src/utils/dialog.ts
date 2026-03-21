export function showDialogById(dialogId: string) {
  const element = document.getElementById(dialogId);
  if (!(element instanceof HTMLDialogElement)) {
    return;
  }

  if (!element.open) {
    element.showModal();
  }
}
