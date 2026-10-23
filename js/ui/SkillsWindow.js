import { t } from '../i18n/I18n.js';

const SKILL_ORDER = ['health', 'armor', 'melee', 'ranged', 'heal', 'speed', 'stealth', 'gold'];

export function createSkillsWindow(state, ui, handlers = {}) {
  const windowEl = document.getElementById('skills-window');
  const pointsEl = document.getElementById('skills-points');
  const list = document.getElementById('skills-list');
  const resetButton = document.getElementById('skills-reset');
  const closeButton = document.getElementById('skills-close');
  const openButton = document.getElementById('talents-button');

  let data = null;

  function isOpen() {
    return !windowEl.classList.contains('hidden');
  }

  function hide() {
    windowEl.classList.add('hidden');
  }

  function toggle() {
    windowEl.classList.toggle('hidden');
  }

  function buildRow(entry) {
    const row = document.createElement('div');
    row.className = 'skill-row';

    const info = document.createElement('div');
    info.className = 'skill-info';

    const name = document.createElement('div');
    name.className = 'skill-name';
    name.textContent = t(`skill.${entry.id}.name`);
    info.appendChild(name);

    const desc = document.createElement('div');
    desc.className = 'skill-desc';
    desc.textContent = t(`skill.${entry.id}.desc`, { value: entry.perPoint, total: entry.rank * entry.perPoint });
    info.appendChild(desc);

    const rank = document.createElement('div');
    rank.className = 'skill-rank';
    rank.textContent = `${entry.rank}/${entry.max}`;

    const add = document.createElement('button');
    add.className = 'skill-add';
    add.textContent = '+';
    add.title = t('skills.spend');
    add.disabled = data.free <= 0 || entry.rank >= entry.max;
    add.addEventListener('click', () => handlers.onSpend?.(entry.id));

    row.append(info, rank, add);
    return row;
  }

  function render(message) {
    data = message;
    pointsEl.textContent = t('skills.points', { free: data.free, total: data.total });

    const entries = SKILL_ORDER.map((id) => data.entries.find((entry) => entry.id === id)).filter(Boolean);
    list.replaceChildren(...entries.map(buildRow));

    const spent = data.total - data.free;
    resetButton.textContent = t('skills.reset', { cost: data.resetCost.toLocaleString('de-DE') });
    resetButton.disabled = spent <= 0;

    openButton.classList.toggle('attention', data.free > 0);
  }

  resetButton.addEventListener('click', () => {
    if (!data) return;
    ui.confirmDialog.open(t('skills.resetConfirm', { cost: data.resetCost.toLocaleString('de-DE') }), t('skills.resetYes'), () => handlers.onReset?.());
  });
  closeButton.addEventListener('click', hide);
  openButton.addEventListener('click', toggle);

  return { render, isOpen, hide, toggle };
}
