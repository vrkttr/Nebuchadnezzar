import { t } from '../i18n/I18n.js';

export function createInventory(state, ui, handlers = {}) {
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

  function render(slots) {
    state.inventory = slots;
    ui.tooltip.hide();
    grid.replaceChildren(...slots.map(buildSlot));
  }

  if (bagButton) {
    bagButton.replaceChildren(ui.createIcon('backpack'));
    bagButton.addEventListener('click', toggle);
  }

  closeButton.addEventListener('click', hide);

  return { render, toggle, hide, isOpen };
}
