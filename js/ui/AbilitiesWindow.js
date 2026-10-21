import { t } from '../i18n/I18n.js';

export function createAbilitiesWindow(ui) {
  const windowEl = document.getElementById('abilities-window');
  const list = document.getElementById('abilities-list');
  const closeButton = document.getElementById('abilities-close');
  const openButton = document.getElementById('skills-button');

  function isOpen() {
    return !windowEl.classList.contains('hidden');
  }

  function hide() {
    windowEl.classList.add('hidden');
    ui.tooltip.hide();
  }

  function toggle() {
    windowEl.classList.toggle('hidden');
    ui.tooltip.hide();
  }

  function buildRow(ability) {
    const row = document.createElement('div');
    row.className = ability.unlocked ? 'ability-row' : 'ability-row locked';

    const iconBox = document.createElement('div');
    iconBox.className = 'ability-row-icon';
    const icon = ui.createIcon(ability.icon, 'slot-icon');
    iconBox.appendChild(icon);
    row.appendChild(iconBox);

    const info = document.createElement('div');
    info.className = 'ability-row-info';

    const name = document.createElement('div');
    name.className = 'ability-row-name';
    name.textContent = ability.name;
    info.appendChild(name);

    const meta = document.createElement('div');
    meta.className = 'ability-row-meta';
    meta.textContent = ability.unlocked
      ? ability.slot
        ? t('abilities.onBar', { slot: ability.slot })
        : t('abilities.notOnBar')
      : t('abilities.unlockLevel', { level: ability.unlockLevel });
    info.appendChild(meta);

    row.appendChild(info);

    row.addEventListener('mouseenter', (event) => ui.tooltip.showAbility(ability, event));
    row.addEventListener('mousemove', (event) => ui.tooltip.move(event));
    row.addEventListener('mouseleave', () => ui.tooltip.hide());

    if (ability.unlocked) {
      ui.abilityDrag.attach(iconBox, () => ({
        abilityId: ability.id,
        fromSlot: null,
        icon,
      }));
      iconBox.addEventListener('pointerdown', () => ui.tooltip.hide());
    }

    return row;
  }

  function render(abilities) {
    list.replaceChildren(...abilities.map(buildRow));
  }

  closeButton.addEventListener('click', hide);
  openButton.addEventListener('click', toggle);

  return { render, isOpen, hide, toggle };
}
