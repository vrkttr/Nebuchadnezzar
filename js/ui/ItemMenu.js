const VIEWPORT_MARGIN = 8;

export function createItemMenu() {
  const element = document.getElementById('item-menu');

  function isOpen() {
    return !element.classList.contains('hidden');
  }

  function close() {
    element.classList.add('hidden');
    element.replaceChildren();
  }

  function open(event, actions) {
    element.replaceChildren(
      ...actions.map((action) => {
        const button = document.createElement('button');
        button.className = action.danger ? 'item-menu-button item-menu-danger' : 'item-menu-button';
        button.textContent = action.label;
        button.addEventListener('click', () => {
          close();
          action.onSelect();
        });
        return button;
      })
    );

    element.classList.remove('hidden');

    const rect = element.getBoundingClientRect();
    const x = Math.min(event.clientX, window.innerWidth - rect.width - VIEWPORT_MARGIN);
    const y = Math.min(event.clientY, window.innerHeight - rect.height - VIEWPORT_MARGIN);

    element.style.left = `${Math.max(VIEWPORT_MARGIN, x)}px`;
    element.style.top = `${Math.max(VIEWPORT_MARGIN, y)}px`;
  }

  document.addEventListener('mousedown', (event) => {
    if (isOpen() && !element.contains(event.target)) close();
  });

  return { open, close, isOpen };
}
