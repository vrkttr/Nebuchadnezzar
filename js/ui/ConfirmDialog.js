export function createConfirmDialog() {
  const element = document.getElementById('confirm-dialog');
  const text = document.getElementById('confirm-text');
  const yesButton = document.getElementById('confirm-yes');
  const noButton = document.getElementById('confirm-no');

  let onConfirm = null;

  function isOpen() {
    return !element.classList.contains('hidden');
  }

  function close() {
    element.classList.add('hidden');
    onConfirm = null;
  }

  function open(message, confirmLabel, callback) {
    text.textContent = message;
    yesButton.textContent = confirmLabel;
    onConfirm = callback;
    element.classList.remove('hidden');
  }

  yesButton.addEventListener('click', () => {
    const callback = onConfirm;
    close();
    callback?.();
  });

  noButton.addEventListener('click', close);

  return { open, close, isOpen };
}
