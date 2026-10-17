const TYPE_LABELS = {
  material: 'Material',
  consumable: 'Verbrauchsgut',
  weapon: 'Waffe',
};

function describeItem(item, quantity) {
  if (!item) return 'Unbekannter Gegenstand';

  const lines = [quantity > 1 ? `${item.name} x${quantity}` : item.name];
  lines.push(TYPE_LABELS[item.type] ?? item.type);
  if (item.description) lines.push(item.description);
  if (item.stackSize > 1) lines.push(`Stapelgröße: ${item.stackSize}`);

  return lines.join('\n');
}

export function createInventory(state) {
  const windowEl = document.getElementById('inventory-window');
  const grid = document.getElementById('inventory-grid');
  const closeButton = document.getElementById('inventory-close');
  const bagButton = document.querySelector('#bag-bar .bag-slot');

  function isOpen() {
    return !windowEl.classList.contains('hidden');
  }

  function hide() {
    windowEl.classList.add('hidden');
  }

  function toggle() {
    windowEl.classList.toggle('hidden');
  }

  function buildSlot(slot) {
    const element = document.createElement('div');
    element.className = 'inventory-slot';

    if (!slot) return element;

    const item = state.items[slot.itemId];

    element.classList.add('filled', `quality-${item?.quality ?? 'common'}`);
    element.title = describeItem(item, slot.quantity);

    const shortEl = document.createElement('span');
    shortEl.className = 'item-short';
    shortEl.textContent = item?.shortName ?? '?';
    element.appendChild(shortEl);

    if (slot.quantity > 1) {
      const countEl = document.createElement('span');
      countEl.className = 'item-count';
      countEl.textContent = slot.quantity;
      element.appendChild(countEl);
    }

    return element;
  }

  function render(slots) {
    state.inventory = slots;
    grid.replaceChildren(...slots.map(buildSlot));
  }

  closeButton.addEventListener('click', hide);
  bagButton?.addEventListener('click', toggle);

  return { render, toggle, hide, isOpen };
}
