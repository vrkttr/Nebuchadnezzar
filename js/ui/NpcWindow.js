const OPTION_MARKERS = { available: '!', ready: '?', active: '…' };

export function createNpcWindow(state, ui, handlers = {}) {
  const windowEl = document.getElementById('npc-window');
  const title = document.getElementById('npc-title');
  const body = document.getElementById('npc-body');
  const closeButton = document.getElementById('npc-close');

  let data = null;
  let activeQuestId = null;

  function isOpen() {
    return !windowEl.classList.contains('hidden');
  }

  function hide() {
    windowEl.classList.add('hidden');
    ui.tooltip.hide();
    data = null;
    activeQuestId = null;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(label, className, onClick) {
    const node = element('button', className, label);
    node.addEventListener('click', onClick);
    return node;
  }

  function rewardItem(entry) {
    const item = state.items[entry.itemId];
    const row = element('div', 'npc-reward-item');

    const icon = element('span', `npc-reward-icon quality-${item?.quality ?? 'common'}`);
    if (item?.icon) {
      icon.appendChild(ui.createIcon(item.icon));
    } else {
      icon.textContent = item?.shortName ?? '?';
    }

    const suffix = entry.quantity > 1 ? ` x${entry.quantity}` : '';
    row.appendChild(icon);
    row.appendChild(element('span', '', `${item?.name ?? entry.itemId}${suffix}`));

    row.addEventListener('mouseenter', (event) => ui.tooltip.showItem(entry.itemId, 0, event));
    row.addEventListener('mousemove', (event) => ui.tooltip.move(event));
    row.addEventListener('mouseleave', () => ui.tooltip.hide());

    return row;
  }

  function renderMenu() {
    title.textContent = data.name;

    const children = [element('p', 'npc-text', data.greeting)];
    const options = element('div', 'npc-options');

    for (const quest of data.quests) {
      const option = element('button', `npc-option npc-option-${quest.state}`);
      option.appendChild(element('span', 'npc-option-marker', OPTION_MARKERS[quest.state]));
      option.appendChild(element('span', '', quest.name));
      option.addEventListener('click', () => {
        activeQuestId = quest.id;
        render();
      });
      options.appendChild(option);
    }

    if (data.vendor) {
      options.appendChild(button('Handeln', 'npc-option', () => handlers.onVendor?.(data.npcId)));
    }

    options.appendChild(button('Auf Wiedersehen', 'npc-option npc-option-leave', hide));
    children.push(options);

    body.replaceChildren(...children);
  }

  function renderQuest(quest) {
    title.textContent = quest.name;

    const objectives = element('ul', 'npc-objectives');
    for (const objective of quest.objectives) {
      const line = element('li', objective.current >= objective.target ? 'done' : '');
      line.textContent = `${objective.label}: ${objective.current}/${objective.target}`;
      objectives.appendChild(line);
    }

    const rewards = element('div', 'npc-rewards');
    rewards.appendChild(element('div', 'npc-rewards-title', 'Belohnung'));

    const currencies = [];
    if (quest.rewards.xp > 0) currencies.push(`${quest.rewards.xp} Erfahrung`);
    if (quest.rewards.gold > 0) currencies.push(`${quest.rewards.gold} Gold`);
    if (currencies.length > 0) rewards.appendChild(element('div', 'npc-reward-line', currencies.join(' · ')));

    for (const entry of quest.rewards.items) rewards.appendChild(rewardItem(entry));

    const buttons = element('div', 'npc-buttons');

    if (quest.state === 'available') {
      buttons.appendChild(
        button('Annehmen', 'window-button', () => handlers.onAccept?.(data.npcId, quest.id))
      );
    } else if (quest.state === 'ready') {
      buttons.appendChild(
        button('Abgeben', 'window-button', () => handlers.onComplete?.(data.npcId, quest.id))
      );
    }

    buttons.appendChild(
      button('Zurück', 'window-button', () => {
        activeQuestId = null;
        render();
      })
    );

    const children = [element('p', 'npc-text', quest.text), objectives];

    if (quest.state === 'active' && quest.turnInName) {
      children.push(element('p', 'npc-hint', `Abgabe bei: ${quest.turnInName}`));
    }

    children.push(rewards, buttons);
    body.replaceChildren(...children);
  }

  function render() {
    ui.tooltip.hide();

    const quest = activeQuestId ? data.quests.find((candidate) => candidate.id === activeQuestId) : null;

    if (quest) {
      renderQuest(quest);
    } else {
      activeQuestId = null;
      renderMenu();
    }
  }

  function show(message) {
    if (!data || data.npcId !== message.npcId) activeQuestId = null;

    data = message;
    render();
    windowEl.classList.remove('hidden');
  }

  closeButton.addEventListener('click', hide);

  return { show, hide, isOpen, currentNpcId: () => data?.npcId ?? null };
}
