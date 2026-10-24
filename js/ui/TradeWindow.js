import { t, formatNumber } from '../i18n/I18n.js';

const SLOT_COUNT = 6;

export function createTradeWindow(state, ui, handlers = {}) {
  const windowEl = document.getElementById('trade-window');
  const title = document.getElementById('trade-title');
  const closeButton = document.getElementById('trade-close');
  const mineTitle = document.getElementById('trade-mine-title');
  const theirsTitle = document.getElementById('trade-theirs-title');
  const mineSlots = document.getElementById('trade-mine-slots');
  const theirsSlots = document.getElementById('trade-theirs-slots');
  const goldInput = document.getElementById('trade-gold-input');
  const theirsGold = document.getElementById('trade-theirs-gold');
  const mineStatus = document.getElementById('trade-mine-status');
  const theirsStatus = document.getElementById('trade-theirs-status');
  const acceptButton = document.getElementById('trade-accept');
  const cancelButton = document.getElementById('trade-cancel');
  const quantityBox = document.getElementById('trade-quantity');
  const quantityInput = document.getElementById('trade-quantity-input');
  const quantityOk = document.getElementById('trade-quantity-ok');
  const quantityCancel = document.getElementById('trade-quantity-cancel');

  let data = null;
  let quantityRequest = null;

  function isOpen() {
    return !windowEl.classList.contains('hidden');
  }

  function hide() {
    windowEl.classList.add('hidden');
    quantityBox.classList.add('hidden');
    quantityRequest = null;
    ui.tooltip.hide();
    data = null;
  }

  function lockedSlots() {
    const locked = new Set();
    if (!data) return locked;
    for (const entry of data.mine.items) if (entry) locked.add(entry.slot);
    return locked;
  }

  function askQuantity(max, onConfirm) {
    quantityRequest = { max, onConfirm };
    quantityInput.max = String(max);
    quantityInput.value = String(max);
    quantityBox.classList.remove('hidden');
    quantityInput.focus();
    quantityInput.select();
  }

  function confirmQuantity() {
    if (!quantityRequest) return;
    const value = Math.floor(Number(quantityInput.value));
    const { max, onConfirm } = quantityRequest;
    quantityRequest = null;
    quantityBox.classList.add('hidden');
    if (Number.isFinite(value) && value >= 1) onConfirm(Math.min(value, max));
  }

  function offer(tradeSlot, invSlot, split) {
    const stack = state.inventory[invSlot];
    if (!stack) return;

    if (split && stack.quantity > 1) {
      askQuantity(stack.quantity, (quantity) => handlers.onOffer?.(tradeSlot, invSlot, quantity));
      return;
    }

    handlers.onOffer?.(tradeSlot, invSlot);
  }

  function addFromInventory(invSlot, split = false) {
    if (!data || lockedSlots().has(invSlot)) return;

    const free = data.mine.items.findIndex((entry) => !entry);
    if (free === -1) return;

    offer(free, invSlot, split);
  }

  function buildSlot(entry, index, mine) {
    const element = document.createElement('div');
    element.className = 'inventory-slot trade-slot';

    if (mine) {
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
        if (Number.isInteger(from)) offer(index, from, event.shiftKey);
      });
    }

    if (!entry) return element;

    const item = state.items[entry.itemId];
    element.classList.add('filled', `quality-${item?.quality ?? 'common'}`);

    if (item?.icon) {
      element.appendChild(ui.createIcon(item.icon));
    } else {
      const shortEl = document.createElement('span');
      shortEl.className = 'item-short';
      shortEl.textContent = item?.shortName ?? '?';
      element.appendChild(shortEl);
    }

    if (entry.quantity > 1) {
      const countEl = document.createElement('span');
      countEl.className = 'item-count';
      countEl.textContent = entry.quantity;
      element.appendChild(countEl);
    }

    element.addEventListener('mouseenter', (event) => ui.tooltip.showItem(entry.itemId, entry.quantity, event, entry.perk ?? null));
    element.addEventListener('mousemove', (event) => ui.tooltip.move(event));
    element.addEventListener('mouseleave', () => ui.tooltip.hide());

    if (mine) {
      const remove = (event) => {
        event.preventDefault();
        ui.tooltip.hide();
        handlers.onClear?.(index);
      };
      element.addEventListener('click', remove);
      element.addEventListener('contextmenu', remove);
    }

    return element;
  }

  function statusText(side, name) {
    return side.accepted ? t('trade.accepted', { name }) : t('trade.waiting');
  }

  function render() {
    if (!data) return;

    title.textContent = t('trade.title', { name: data.partner.name });
    mineTitle.textContent = t('trade.yourOffer');
    theirsTitle.textContent = t('trade.theirOffer', { name: data.partner.name });

    mineSlots.replaceChildren(...data.mine.items.map((entry, index) => buildSlot(entry, index, true)));
    theirsSlots.replaceChildren(...data.theirs.items.map((entry, index) => buildSlot(entry, index, false)));

    if (document.activeElement !== goldInput) goldInput.value = String(data.mine.gold);
    goldInput.max = String(state.player.gold);
    theirsGold.textContent = t('trade.goldAmount', { amount: formatNumber(data.theirs.gold) });

    mineStatus.textContent = statusText(data.mine, t('trade.you'));
    theirsStatus.textContent = statusText(data.theirs, data.partner.name);
    mineStatus.classList.toggle('accepted', data.mine.accepted);
    theirsStatus.classList.toggle('accepted', data.theirs.accepted);

    acceptButton.disabled = data.mine.accepted;
    acceptButton.textContent = data.mine.accepted ? t('trade.accepting') : t('trade.accept');
  }

  function setData(message) {
    const wasOpen = isOpen() && data?.tradeId === message.tradeId;
    data = message;
    windowEl.classList.remove('hidden');
    if (!wasOpen) quantityBox.classList.add('hidden');
    render();
    handlers.onChange?.();
  }

  function close() {
    const wasOpen = isOpen();
    hide();
    if (wasOpen) handlers.onChange?.();
  }

  function cancel() {
    if (!isOpen()) return;
    handlers.onCancel?.();
  }

  function sendGold() {
    const value = Math.max(0, Math.floor(Number(goldInput.value) || 0));
    if (data && value !== data.mine.gold) handlers.onGold?.(value);
    else if (data) goldInput.value = String(data.mine.gold);
  }

  goldInput.addEventListener('change', sendGold);
  goldInput.addEventListener('keydown', (event) => {
    event.stopPropagation();
    if (event.key === 'Enter') {
      sendGold();
      goldInput.blur();
    }
  });
  goldInput.addEventListener('keyup', (event) => event.stopPropagation());
  quantityInput.addEventListener('keydown', (event) => {
    event.stopPropagation();
    if (event.key === 'Enter') confirmQuantity();
    if (event.key === 'Escape') {
      quantityRequest = null;
      quantityBox.classList.add('hidden');
    }
  });
  quantityInput.addEventListener('keyup', (event) => event.stopPropagation());
  quantityOk.addEventListener('click', confirmQuantity);
  quantityCancel.addEventListener('click', () => {
    quantityRequest = null;
    quantityBox.classList.add('hidden');
  });

  acceptButton.addEventListener('click', () => {
    if (!data || data.mine.accepted) return;
    sendGold();
    handlers.onAccept?.();
  });
  cancelButton.addEventListener('click', cancel);
  closeButton.addEventListener('click', cancel);

  return { setData, close, cancel, isOpen, lockedSlots, addFromInventory, update: render };
}
