import { t } from '../i18n/I18n.js';

export function createQuestWindow({ confirmDialog, onAbandon }) {
  const windowEl = document.getElementById('quests-window');
  const list = document.getElementById('quests-list');
  const detail = document.getElementById('quests-detail');
  const closeButton = document.getElementById('quests-close');
  const openButton = document.getElementById('quests-button');

  let quests = [];
  let selectedId = null;

  function isOpen() {
    return !windowEl.classList.contains('hidden');
  }

  function hide() {
    windowEl.classList.add('hidden');
  }

  function toggle() {
    windowEl.classList.toggle('hidden');
    if (isOpen()) render();
  }

  function line(className, text) {
    const element = document.createElement('div');
    element.className = className;
    element.textContent = text;
    return element;
  }

  function buildRow(quest) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = quest.id === selectedId ? 'quest-row selected' : 'quest-row';
    row.appendChild(line('quest-row-name', quest.name));
    row.appendChild(line(quest.ready ? 'quest-row-meta ready' : 'quest-row-meta', quest.ready ? t('questlog.ready') : t('questlog.level', { level: quest.level })));
    row.addEventListener('click', () => {
      selectedId = quest.id;
      render();
    });
    return row;
  }

  function rewardLines(rewards) {
    const lines = [];
    if (rewards.xp > 0) lines.push(t('questlog.xp', { amount: rewards.xp }));
    if (rewards.gold > 0) lines.push(t('questlog.gold', { amount: rewards.gold }));
    for (const item of rewards.items) lines.push(item.quantity > 1 ? `${item.quantity}× ${item.name}` : item.name);
    return lines;
  }

  function renderDetail(quest) {
    if (!quest) {
      detail.replaceChildren(line('quest-detail-empty', quests.length === 0 ? t('questlog.empty') : t('questlog.select')));
      return;
    }

    const nodes = [line('quest-detail-name', quest.name)];
    nodes.push(line('quest-detail-meta', t('questlog.level', { level: quest.level })));
    nodes.push(line('quest-detail-text', quest.description));

    nodes.push(line('quest-detail-heading', t('questlog.objectives')));
    for (const objective of quest.objectives) {
      nodes.push(line(objective.current >= objective.target ? 'quest-objective done' : 'quest-objective', `${objective.label}: ${objective.current}/${objective.target}`));
    }
    if (quest.turnInName) nodes.push(line(quest.ready ? 'quest-ready' : 'quest-detail-meta', t('questlog.turnIn', { name: quest.turnInName })));

    const rewards = rewardLines(quest.rewards);
    if (rewards.length > 0) {
      nodes.push(line('quest-detail-heading', t('questlog.rewards')));
      for (const reward of rewards) nodes.push(line('quest-reward', reward));
    }

    const abandon = document.createElement('button');
    abandon.type = 'button';
    abandon.className = 'window-button window-button-danger quest-abandon';
    abandon.textContent = t('questlog.abandon');
    abandon.addEventListener('click', () => {
      confirmDialog.open(t('questlog.abandonConfirm', { name: quest.name }), t('questlog.abandonYes'), () => onAbandon(quest.id));
    });
    nodes.push(abandon);

    detail.replaceChildren(...nodes);
  }

  function render() {
    if (!quests.some((quest) => quest.id === selectedId)) selectedId = quests[0]?.id ?? null;
    list.replaceChildren(...quests.map(buildRow));
    renderDetail(quests.find((quest) => quest.id === selectedId) ?? null);
  }

  function setQuests(payload) {
    quests = payload.quests;
    if (isOpen()) render();
  }

  closeButton.addEventListener('click', hide);
  openButton.addEventListener('click', toggle);

  return { setQuests, isOpen, hide, toggle };
}
