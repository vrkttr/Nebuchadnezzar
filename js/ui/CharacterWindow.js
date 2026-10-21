import { t } from '../i18n/I18n.js';
import { slotLabel } from './Tooltip.js';

const SLOT_ORDER = ['head', 'chest', 'legs', 'weapon'];

export function createCharacterWindow(state, ui, handlers = {}) {
  const windowEl = document.getElementById('character-window');
  const grid = document.getElementById('equipment-grid');
  const statsEl = document.getElementById('character-stats');
  const closeButton = document.getElementById('character-close');
  const openButton = document.querySelector('#minimap-buttons button[data-i18n-title="hud.menu.character"]');

  const cells = new Map();
  const statValues = new Map();

  function isOpen() {
    return !windowEl.classList.contains('hidden');
  }

  function hide() {
    windowEl.classList.add('hidden');
  }

  function toggle() {
    windowEl.classList.toggle('hidden');
  }

  function buildSlots() {
    for (const slot of SLOT_ORDER) {
      const wrapper = document.createElement('div');
      wrapper.className = 'equipment-slot';

      const label = document.createElement('span');
      label.className = 'equipment-slot-label';
      label.textContent = slotLabel(slot);

      const cell = document.createElement('div');
      cell.className = 'inventory-slot equipment-cell';

      wrapper.appendChild(label);
      wrapper.appendChild(cell);
      grid.appendChild(wrapper);
      cells.set(slot, cell);
    }
  }

  function buildStats() {
    const rows = [
      ['class', 'character.class'],
      ['level', 'character.level'],
      ['health', 'character.health'],
      ['resource', 'character.resource'],
      ['damage', 'character.damage'],
      ['armor', 'character.armor'],
    ];

    for (const [key, label] of rows) {
      const term = document.createElement('dt');
      term.textContent = t(label);

      const value = document.createElement('dd');

      statsEl.appendChild(term);
      statsEl.appendChild(value);
      statValues.set(key, value);
    }
  }

  function fillCell(slot, itemId) {
    const cell = cells.get(slot);
    const item = itemId ? state.items[itemId] : null;

    cell.replaceChildren();
    cell.className = 'inventory-slot equipment-cell';
    cell.onmouseenter = null;
    cell.onmousemove = null;
    cell.onmouseleave = null;
    cell.onclick = null;
    cell.oncontextmenu = null;

    if (!itemId) return;

    cell.classList.add('filled', `quality-${item?.quality ?? 'common'}`);

    if (item?.icon) {
      cell.appendChild(ui.createIcon(item.icon));
    } else {
      const shortEl = document.createElement('span');
      shortEl.className = 'item-short';
      shortEl.textContent = item?.shortName ?? '?';
      cell.appendChild(shortEl);
    }

    cell.onmouseenter = (event) => ui.tooltip.showItem(itemId, 0, event);
    cell.onmousemove = (event) => ui.tooltip.move(event);
    cell.onmouseleave = () => ui.tooltip.hide();
    cell.onclick = (event) => {
      ui.tooltip.hide();
      ui.itemMenu.open(event, [{ label: t('character.unequip'), onSelect: () => handlers.onUnequip?.(slot) }]);
    };
    cell.oncontextmenu = (event) => {
      event.preventDefault();
      ui.tooltip.hide();
      handlers.onUnequip?.(slot);
    };
  }

  function render(equipment) {
    state.equipment = equipment;
    ui.tooltip.hide();

    for (const slot of SLOT_ORDER) {
      fillCell(slot, equipment[slot] ?? null);
    }
  }

  function update() {
    const { player } = state;

    const classValue = statValues.get('class');
    classValue.textContent = player.classId ? t(`class.${player.classId}.name`) : '—';
    classValue.title = player.classId ? `${t(`class.${player.classId}.description`)}\n${t(`class.${player.classId}.bonus`)}` : '';
    statValues.get('level').textContent = player.level;
    statValues.get('health').textContent = `${Math.round(player.health)} / ${player.healthMax}`;
    statValues.get('resource').textContent = `${Math.round(player.resource)} / ${player.resourceMax}`;
    statValues.get('damage').textContent = `${player.damageMin}–${player.damageMax}`;
    statValues.get('armor').textContent = player.armor;
  }

  buildSlots();
  buildStats();
  update();

  closeButton.addEventListener('click', hide);
  openButton?.addEventListener('click', toggle);

  return { render, update, toggle, hide, isOpen };
}
