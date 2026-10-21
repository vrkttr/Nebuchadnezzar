import { t } from '../i18n/I18n.js';

const OPTION_MARKERS = { available: '!', ready: '?', active: '…' };

export function createNpcWindow(state, ui, handlers = {}) {
  const windowEl = document.getElementById('npc-window');
  const title = document.getElementById('npc-title');
  const body = document.getElementById('npc-body');
  const closeButton = document.getElementById('npc-close');

  let data = null;
  let activeQuestId = null;
  let guildForm = false;

  function isOpen() {
    return !windowEl.classList.contains('hidden');
  }

  function hide() {
    windowEl.classList.add('hidden');
    ui.tooltip.hide();
    data = null;
    activeQuestId = null;
    guildForm = false;
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
      options.appendChild(button(t('npc.trade'), 'npc-option', () => handlers.onVendor?.(data.npcId)));
    }

    if (data.guild && !data.guildName) {
      options.appendChild(
        button(t('guild.found'), 'npc-option', () => {
          guildForm = true;
          render();
        })
      );
    }

    if (data.guild && data.guildName) {
      options.appendChild(
        button(t('guild.leave', { name: data.guildName }), 'npc-option', () => {
          ui.confirmDialog.open(t('guild.leaveConfirm', { name: data.guildName }), t('guild.leaveYes'), () =>
            handlers.onGuildLeave?.(data.npcId)
          );
        })
      );
    }

    options.appendChild(button(t('npc.leave'), 'npc-option npc-option-leave', hide));
    children.push(options);

    body.replaceChildren(...children);
  }

  function renderGuildForm() {
    title.textContent = t('guild.found');

    const input = element('input', 'guild-input');
    input.type = 'text';
    input.maxLength = 20;
    input.autocomplete = 'off';
    input.placeholder = t('guild.namePlaceholder');
    input.addEventListener('keydown', (event) => {
      if (event.code !== 'Escape') event.stopPropagation();
    });
    input.addEventListener('keyup', (event) => event.stopPropagation());
    input.addEventListener('input', () => {
      input.value = input.value.replace(/[^\p{L}]/gu, '');
    });

    const submit = () => {
      const name = input.value.trim();
      if (name.length < 3) return;
      guildForm = false;
      handlers.onGuildCreate?.(data.npcId, name);
    };
    input.addEventListener('keydown', (event) => {
      if (event.code === 'Enter' || event.code === 'NumpadEnter') submit();
    });

    const buttons = element('div', 'npc-buttons');
    buttons.appendChild(button(t('guild.create'), 'window-button', submit));
    buttons.appendChild(
      button(t('npc.back'), 'window-button', () => {
        guildForm = false;
        render();
      })
    );

    body.replaceChildren(element('p', 'npc-text', t('guild.nameHint')), input, buttons);
    setTimeout(() => input.focus(), 0);
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
    rewards.appendChild(element('div', 'npc-rewards-title', t('npc.reward')));

    const currencies = [];
    if (quest.rewards.xp > 0) currencies.push(t('npc.rewardXp', { amount: quest.rewards.xp }));
    if (quest.rewards.gold > 0) currencies.push(t('npc.rewardGold', { amount: quest.rewards.gold }));
    if (currencies.length > 0) rewards.appendChild(element('div', 'npc-reward-line', currencies.join(' · ')));

    for (const entry of quest.rewards.items) rewards.appendChild(rewardItem(entry));

    const buttons = element('div', 'npc-buttons');

    if (quest.state === 'available') {
      buttons.appendChild(
        button(t('npc.accept'), 'window-button', () => handlers.onAccept?.(data.npcId, quest.id))
      );
    } else if (quest.state === 'ready') {
      buttons.appendChild(
        button(t('npc.complete'), 'window-button', () => handlers.onComplete?.(data.npcId, quest.id))
      );
    }

    buttons.appendChild(
      button(t('npc.back'), 'window-button', () => {
        activeQuestId = null;
        render();
      })
    );

    const children = [element('p', 'npc-text', quest.text), objectives];

    if (quest.state === 'active' && quest.turnInName) {
      children.push(element('p', 'npc-hint', t('npc.turnInAt', { name: quest.turnInName })));
    }

    children.push(rewards, buttons);
    body.replaceChildren(...children);
  }

  function render() {
    ui.tooltip.hide();

    if (guildForm) {
      renderGuildForm();
      return;
    }

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
    if (message.guildName) guildForm = false;
    render();
    windowEl.classList.remove('hidden');
  }

  closeButton.addEventListener('click', hide);

  return { show, hide, isOpen, currentNpcId: () => data?.npcId ?? null };
}
