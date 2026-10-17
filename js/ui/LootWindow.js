export function createLootWindow(state, handlers = {}) {
  const windowEl = document.getElementById('loot-window');
  const title = document.getElementById('loot-title');
  const entriesEl = document.getElementById('loot-entries');
  const takeAllButton = document.getElementById('loot-take-all');
  const closeButton = document.getElementById('loot-close');

  let currentId = null;

  function isOpen() {
    return !windowEl.classList.contains('hidden');
  }

  function hide() {
    windowEl.classList.add('hidden');
    currentId = null;
  }

  function buildEntry(container, entry) {
    const item = state.items[entry.itemId];

    const button = document.createElement('button');
    button.className = 'loot-entry';
    button.title = item?.description ?? '';

    const icon = document.createElement('span');
    icon.className = `loot-entry-icon quality-${item?.quality ?? 'common'}`;
    icon.textContent = item?.shortName ?? '?';

    const name = document.createElement('span');
    name.className = 'loot-entry-name';
    name.textContent = item?.name ?? entry.itemId;

    button.appendChild(icon);
    button.appendChild(name);

    if (entry.quantity > 1) {
      const count = document.createElement('span');
      count.className = 'loot-entry-count';
      count.textContent = `x${entry.quantity}`;
      button.appendChild(count);
    }

    button.addEventListener('click', () => handlers.onTake?.(container.id, entry.id));

    return button;
  }

  function show(container) {
    currentId = container.id;
    title.textContent = container.name;
    entriesEl.replaceChildren(...container.entries.map((entry) => buildEntry(container, entry)));
    windowEl.classList.remove('hidden');
  }

  closeButton.addEventListener('click', hide);
  takeAllButton.addEventListener('click', () => {
    if (currentId) handlers.onTakeAll?.(currentId);
  });

  return { show, hide, isOpen, currentId: () => currentId };
}
