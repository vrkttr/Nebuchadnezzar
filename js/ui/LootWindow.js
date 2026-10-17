export function createLootWindow(state, ui, handlers = {}) {
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
    ui.tooltip.hide();
    currentId = null;
  }

  function buildEntry(container, entry) {
    const item = state.items[entry.itemId];

    const button = document.createElement('button');
    button.className = 'loot-entry';

    const icon = document.createElement('span');
    icon.className = `loot-entry-icon quality-${item?.quality ?? 'common'}`;

    if (item?.icon) {
      icon.appendChild(ui.createIcon(item.icon));
    } else {
      icon.textContent = item?.shortName ?? '?';
    }

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

    button.addEventListener('mouseenter', (event) => ui.tooltip.showItem(entry.itemId, entry.quantity, event));
    button.addEventListener('mousemove', (event) => ui.tooltip.move(event));
    button.addEventListener('mouseleave', () => ui.tooltip.hide());
    button.addEventListener('click', () => {
      ui.tooltip.hide();
      handlers.onTake?.(container.id, entry.id);
    });

    return button;
  }

  function show(container) {
    currentId = container.id;
    title.textContent = container.name;
    ui.tooltip.hide();
    entriesEl.replaceChildren(...container.entries.map((entry) => buildEntry(container, entry)));
    windowEl.classList.remove('hidden');
  }

  closeButton.addEventListener('click', hide);
  takeAllButton.addEventListener('click', () => {
    if (currentId) handlers.onTakeAll?.(currentId);
  });

  return { show, hide, isOpen, currentId: () => currentId };
}
