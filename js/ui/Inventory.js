import { t } from '../i18n/I18n.js';

export function createInventory(state, ui, handlers = {}) {
  const windowEl = document.getElementById('inventory-window');
  const grid = document.getElementById('inventory-grid');
  const closeButton = document.getElementById('inventory-close');
  const bagBar = document.getElementById('bag-bar');
  const bagButton = document.querySelector('#bag-bar .bag-slot');
  const BAG_KEYS = ['bag1', 'bag2', 'bag3', 'bag4'];
  const BASE_SIZE = 24;
  let bags = {};
  let lastSlots = [];
  const bagButtons = [];

  function isOpen() {
    return !windowEl.classList.contains('hidden');
  }

  function hide() {
    windowEl.classList.add('hidden');
  }

  function toggle() {
    windowEl.classList.toggle('hidden');
  }

  function requestDestroy(index, slot, item) {
    const name = item?.name ?? slot.itemId;
    const suffix = slot.quantity > 1 ? ` (x${slot.quantity})` : '';

    ui.confirmDialog.open(t('item.destroyConfirm', { name, suffix }), t('item.destroy'), () =>
      handlers.onDestroy?.(index, slot.itemId)
    );
  }

  function openMenu(event, index, slot, item) {
    const actions = [];

    if (handlers.isVendorOpen?.() && item?.value > 0) {
      actions.push({
        label: t('item.sell', { gold: item.value * slot.quantity }),
        onSelect: () => handlers.onSell?.(index, slot.itemId),
      });
    }

    if (item?.slot) actions.push({ label: t('item.equip'), onSelect: () => handlers.onUse?.(index) });
    if (item?.use) actions.push({ label: t('item.use'), onSelect: () => handlers.onUse?.(index) });

    actions.push({ label: t('item.destroy'), danger: true, onSelect: () => requestDestroy(index, slot, item) });

    ui.tooltip.hide();
    ui.itemMenu.open(event, actions);
  }

  function buildSlot(slot, index) {
    const element = document.createElement('div');
    element.className = 'inventory-slot';

    element.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      element.classList.add('drop-target');
    });
    element.addEventListener('dragleave', () => element.classList.remove('drop-target'));
    element.addEventListener('drop', (event) => {
      event.preventDefault();
      element.classList.remove('drop-target');
      const from = Number.parseInt(event.dataTransfer.getData('text/plain'), 10);
      if (Number.isInteger(from) && from !== index) handlers.onMove?.(from, index);
    });

    if (!slot) return element;

    const item = state.items[slot.itemId];

    element.classList.add('filled', `quality-${item?.quality ?? 'common'}`);

    if (item?.icon) {
      element.appendChild(ui.createIcon(item.icon));
    } else {
      const shortEl = document.createElement('span');
      shortEl.className = 'item-short';
      shortEl.textContent = item?.shortName ?? '?';
      element.appendChild(shortEl);
    }

    if (slot.quantity > 1) {
      const countEl = document.createElement('span');
      countEl.className = 'item-count';
      countEl.textContent = slot.quantity;
      element.appendChild(countEl);
    }

    element.addEventListener('mouseenter', (event) => ui.tooltip.showItem(slot.itemId, slot.quantity, event, slot.perk ?? null));
    element.addEventListener('mousemove', (event) => ui.tooltip.move(event));
    element.addEventListener('mouseleave', () => ui.tooltip.hide());
    element.draggable = true;
    element.addEventListener('dragstart', (event) => {
      ui.tooltip.hide();
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
      element.classList.add('dragging');
    });
    element.addEventListener('dragend', () => element.classList.remove('dragging'));
    element.addEventListener('click', (event) => openMenu(event, index, slot, item));
    element.addEventListener('contextmenu', (event) => {
      event.preventDefault();

      if (handlers.isVendorOpen?.()) {
        if (item?.value > 0) {
          ui.tooltip.hide();
          handlers.onSell?.(index, slot.itemId);
        }
        return;
      }

      if (item?.slot || item?.use) {
        ui.tooltip.hide();
        handlers.onUse?.(index);
      }
    });

    return element;
  }

  function bagLayout() {
    const sections = [];
    let start = BASE_SIZE;

    for (const key of BAG_KEYS) {
      const item = bags[key] ? state.items[bags[key]] : null;
      const size = item?.bagSlots ?? 0;
      if (size > 0) {
        sections.push({ key, item, start, size });
        start += size;
      }
    }

    return sections;
  }

  function render(slots) {
    state.inventory = slots;
    lastSlots = slots;
    ui.tooltip.hide();

    const nodes = slots.slice(0, BASE_SIZE).map((slot, index) => buildSlot(slot, index));

    for (const section of bagLayout()) {
      const label = document.createElement('div');
      label.className = 'inventory-section';
      label.textContent = t('inventory.bagSection', { name: section.item.name });
      nodes.push(label);

      for (let index = section.start; index < section.start + section.size; index += 1) {
        nodes.push(buildSlot(slots[index] ?? null, index));
      }
    }

    grid.replaceChildren(...nodes);
  }

  function renderBagButtons() {
    BAG_KEYS.forEach((key, i) => {
      const button = bagButtons[i];
      const itemId = bags[key] ?? null;
      const item = itemId ? state.items[itemId] : null;
      button.replaceChildren();
      button.classList.toggle('filled', Boolean(item));
      button.title = item ? '' : t('inventory.bagSlotEmpty');
      if (item) button.appendChild(ui.createIcon(item.icon ?? item.id));
    });
  }

  function setBags(slots) {
    bags = slots ?? {};
    renderBagButtons();
    render(lastSlots);
  }

  BAG_KEYS.forEach((key, i) => {
    const button = document.createElement('button');
    button.className = 'bag-slot bag-equip';
    button.addEventListener('mouseenter', (event) => {
      if (bags[key]) ui.tooltip.showItem(bags[key], 1, event);
    });
    button.addEventListener('mousemove', (event) => ui.tooltip.move(event));
    button.addEventListener('mouseleave', () => ui.tooltip.hide());
    button.addEventListener('click', (event) => {
      if (!bags[key]) return;
      ui.tooltip.hide();
      ui.itemMenu.open(event, [{ label: t('character.unequipBag'), onSelect: () => handlers.onUnequip?.(key) }]);
    });
    button.addEventListener('dragover', (event) => event.preventDefault());
    button.addEventListener('drop', (event) => {
      event.preventDefault();
      const from = Number.parseInt(event.dataTransfer.getData('text/plain'), 10);
      const dropped = lastSlots[from] ? state.items[lastSlots[from].itemId] : null;
      if (dropped?.type === 'bag') handlers.onUse?.(from);
    });
    bagBar?.appendChild(button);
    bagButtons.push(button);
  });
  renderBagButtons();

  if (bagButton) {
    bagButton.replaceChildren(ui.createIcon('backpack'));
    bagButton.addEventListener('click', toggle);
  }

  closeButton.addEventListener('click', hide);

  return { render, setBags, toggle, hide, isOpen };
}
