export function createIntroWindow(handlers = {}) {
  const windowEl = document.getElementById('intro-window');
  const closeButtons = [document.getElementById('intro-close'), document.getElementById('intro-start')];

  function isOpen() {
    return !windowEl.classList.contains('hidden');
  }

  function show() {
    windowEl.classList.remove('hidden');
  }

  function hide() {
    if (!isOpen()) return;
    windowEl.classList.add('hidden');
    handlers.onClose?.();
  }

  for (const button of closeButtons) button.addEventListener('click', hide);

  return { show, hide, isOpen };
}
