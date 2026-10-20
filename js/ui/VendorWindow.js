import { t, formatNumber } from '../i18n/I18n.js';

const SHIFT_QUANTITY = 5;

export function createVendorWindow(state, ui, handlers = {}) {
  const windowEl = document.getElementById('vendor-window');
  const title = document.getElementById('vendor-title');
  const goldEl = document.getElementById('vendor-gold');
  const stockEl = document.getElementById('vendor-stock');
  const closeButton = document.getElementById('vendor-close');

  let data = null;
  const priceEls = [];

  function isOpen() {
    return !windowEl.classList.contains('hidden');
  }

  function hide() {
    windowEl.classList.add('hidden');
    ui.tooltip.hide();
    data = null;
    priceEls.length = 0;
  }

  function buildRow(entry) {
    const item = state.items[entry.itemId];

    const row = document.createElement('button');
    row.className = 'vendor-row';

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

    const price = document.createElement('span');
    price.className = 'vendor-price';
    price.textContent = t('vendor.price', { price: formatNumber(entry.price) });

    row.appendChild(icon);
    row.appendChild(name);
    row.appendChild(price);

    row.addEventListener('mouseenter', (event) => ui.tooltip.showItem(entry.itemId, 0, event));
    row.addEventListener('mousemove', (event) => ui.tooltip.move(event));
    row.addEventListener('mouseleave', () => ui.tooltip.hide());
    row.addEventListener('click', (event) => {
      const quantity = event.shiftKey ? Math.min(SHIFT_QUANTITY, item?.stackSize ?? 1) : 1;
      handlers.onBuy?.(data.npcId, entry.itemId, quantity);
    });

    priceEls.push({ price, cost: entry.price });

    return row;
  }

  function update() {
    if (!data) return;

    goldEl.textContent = t('vendor.yourGold', { amount: formatNumber(state.player.gold) });

    for (const { price, cost } of priceEls) {
      price.classList.toggle('too-expensive', state.player.gold < cost);
    }
  }

  function show(message) {
    data = message;
    priceEls.length = 0;
    title.textContent = message.name;
    stockEl.replaceChildren(...message.stock.map(buildRow));
    windowEl.classList.remove('hidden');
    update();
  }

  closeButton.addEventListener('click', hide);

  return { show, hide, isOpen, update, currentNpcId: () => data?.npcId ?? null };
}
