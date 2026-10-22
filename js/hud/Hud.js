import { t, tOr, formatNumber } from '../i18n/I18n.js';

function toPercent(value, max) {
  if (!max) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

const MAX_CHAT_LINES = 50;

function failureText(group, reason, fallbackKey = 'failure.default') {
  return tOr([`failure.${group}.${reason}`, `failure.${group}.default`], t(fallbackKey));
}

export function createHud(state, handlers = {}) {
  const castBar = document.getElementById('cast-bar');
  const castFill = document.getElementById('cast-bar-fill');
  const castLabel = document.getElementById('cast-bar-label');
  let cast = null;
  const playerName = document.getElementById('player-name');
  const playerLevel = document.getElementById('player-level');
  const playerHealthFill = document.getElementById('player-health-fill');
  const playerHealthText = document.getElementById('player-health-text');
  const playerResourceFill = document.getElementById('player-resource-fill');
  const playerResourceText = document.getElementById('player-resource-text');
  const xpFill = document.getElementById('xp-fill');
  const goldAmount = document.getElementById('gold-amount');
  const zoneName = document.getElementById('zone-name');
  const chatMessages = document.getElementById('chat-messages');
  const questList = document.getElementById('quest-list');
  const slotElements = Array.from(document.querySelectorAll('#action-bar .action-slot'));
  const abilitySlots = [];
  const itemSlots = [];

  slotElements.forEach((element, index) => {
    element.dataset.slot = String(index + 1);
    handlers.ui?.abilityDrag.attach(element, () => {
      const entry = abilitySlots.find((slot) => slot.element === element);
      const itemEntry = itemSlots.find((slot) => slot.element === element);
      if (!entry && !itemEntry) return null;

      handlers.ui.tooltip.hide();
      if (itemEntry) {
        return { abilityId: `item:${itemEntry.itemId}`, fromSlot: index + 1, icon: element.querySelector('.slot-icon'), label: itemEntry.label };
      }
      return { abilityId: entry.ability.id, fromSlot: index + 1, icon: element.querySelector('.slot-icon'), label: entry.ability.shortName };
    });

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
      const stack = Number.isInteger(from) ? state.inventory[from] : null;
      const item = stack ? state.items[stack.itemId] : null;
      if (item?.use) handlers.onItemDrop?.(index + 1, item.id);
    });
  });

  const targetFrame = document.getElementById('target-frame');
  const targetName = document.getElementById('target-name');
  const targetLevel = document.getElementById('target-level');
  const targetHealthFill = document.getElementById('target-health-fill');
  const targetInvite = document.getElementById('target-invite');
  targetInvite.addEventListener('click', () => handlers.onInvite?.());
  const targetGuildKick = document.getElementById('target-guild-kick');
  targetGuildKick.addEventListener('click', () => handlers.onGuildKick?.());
  const targetGuildInvite = document.getElementById('target-guild-invite');
  targetGuildInvite.addEventListener('click', () => handlers.onGuildInvite?.());

  function setAbilities(list, actionItems = []) {
    abilitySlots.length = 0;
    itemSlots.length = 0;

    for (const element of slotElements) {
      element.querySelectorAll('.slot-name, .slot-cooldown, .slot-count').forEach((child) => child.remove());
      element.onclick = null;
      element.onmouseenter = null;
      element.onmousemove = null;
      element.onmouseleave = null;
    }

    for (const ability of list) {
      if (!ability.slot) continue;
      const element = slotElements[ability.slot - 1];
      if (!element) continue;

      const nameEl = document.createElement('span');
      nameEl.className = 'slot-name';

      if (ability.icon && handlers.ui) {
        nameEl.appendChild(handlers.ui.createIcon(ability.icon, 'slot-icon'));
      } else {
        nameEl.textContent = ability.shortName;
      }

      const cooldownEl = document.createElement('div');
      cooldownEl.className = 'slot-cooldown';

      const cooldownTextEl = document.createElement('span');
      cooldownTextEl.className = 'slot-cooldown-text';
      cooldownEl.appendChild(cooldownTextEl);

      element.appendChild(nameEl);
      element.appendChild(cooldownEl);
      element.onclick = () => handlers.onAbility?.(ability.slot);

      if (handlers.ui) {
        element.onmouseenter = (event) => handlers.ui.tooltip.showAbility(ability, event);
        element.onmousemove = (event) => handlers.ui.tooltip.move(event);
        element.onmouseleave = () => handlers.ui.tooltip.hide();
      }

      abilitySlots.push({ ability, element, cooldownEl, cooldownTextEl });
    }

    for (const entry of actionItems) {
      const element = slotElements[entry.slot - 1];
      const item = state.items[entry.itemId];
      if (!element || !item) continue;

      const nameEl = document.createElement('span');
      nameEl.className = 'slot-name';

      if (item.icon && handlers.ui) {
        nameEl.appendChild(handlers.ui.createIcon(item.icon, 'slot-icon'));
      } else {
        nameEl.textContent = item.shortName;
      }

      const countEl = document.createElement('span');
      countEl.className = 'slot-count';

      element.appendChild(nameEl);
      element.appendChild(countEl);
      element.onclick = () => handlers.onAbility?.(entry.slot);

      if (handlers.ui) {
        element.onmouseenter = (event) => handlers.ui.tooltip.showItem(entry.itemId, 0, event);
        element.onmousemove = (event) => handlers.ui.tooltip.move(event);
        element.onmouseleave = () => handlers.ui.tooltip.hide();
      }

      itemSlots.push({ itemId: entry.itemId, element, countEl, label: item.shortName });
    }
    updateItemSlots();
  }

  function updateItemSlots() {
    for (const slot of itemSlots) {
      let total = 0;
      for (const stack of state.inventory) {
        if (stack && stack.itemId === slot.itemId) total += stack.quantity;
      }
      slot.countEl.textContent = total > 1 || state.items[slot.itemId]?.stackSize > 1 ? String(total) : '';
      slot.element.classList.toggle('slot-unaffordable', total === 0);
    }
  }

  const crouchVignette = document.getElementById('crouch-vignette');
  const crouchIndicator = document.getElementById('crouch-indicator');

  function setCrouch(active) {
    crouchVignette.classList.toggle('active', active);
    crouchIndicator.classList.toggle('hidden', !active);
  }

  function addMessage(text) {
    const line = document.createElement('div');
    line.className = 'chat-line chat-line-system';
    line.textContent = text;
    chatMessages.appendChild(line);

    while (chatMessages.childElementCount > MAX_CHAT_LINES) {
      chatMessages.removeChild(chatMessages.firstChild);
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function setQuests(payload) {
    if (payload.quests.length === 0) {
      questList.className = 'empty-state';
      questList.replaceChildren(t('hud.quests.empty'));
      return;
    }

    questList.className = '';

    questList.replaceChildren(
      ...payload.quests.map((quest) => {
        const entry = document.createElement('div');
        entry.className = 'quest-entry';

        const title = document.createElement('div');
        title.className = 'quest-title';
        title.textContent = quest.name;
        entry.appendChild(title);

        for (const objective of quest.objectives) {
          const line = document.createElement('div');
          line.className =
            objective.current >= objective.target ? 'quest-objective done' : 'quest-objective';
          line.textContent = `${objective.label}: ${objective.current}/${objective.target}`;
          entry.appendChild(line);
        }

        if (quest.ready) {
          const ready = document.createElement('div');
          ready.className = 'quest-ready';
          ready.textContent = t('hud.quests.turnIn', { name: quest.turnInName });
          entry.appendChild(ready);
        }

        return entry;
      })
    );
  }

  function startCast(label, durationMs) {
    cast = { label, startedAt: performance.now(), duration: durationMs };
    castLabel.textContent = label;
    castFill.style.width = '0%';
    castBar.classList.remove('hidden');
  }

  function stopCast() {
    cast = null;
    castBar.classList.add('hidden');
  }

  function updateCast() {
    if (!cast) return;
    const ratio = Math.min(1, (performance.now() - cast.startedAt) / cast.duration);
    castFill.style.width = `${ratio * 100}%`;
  }

  function zoneLabel(zoneId) {
    return tOr([`zone.${zoneId}.name`], zoneId);
  }

  function itemName(itemId) {
    return state.items[itemId]?.name ?? itemId;
  }

  function addEvent(event) {
    if (event.kind === 'xp') {
      addMessage(t('event.xp', { amount: event.amount, source: event.enemyName }));
    } else if (event.kind === 'gold') {
      addMessage(t('event.gold', { amount: event.amount }));
    } else if (event.kind === 'item') {
      const item = state.items[event.itemId];
      const suffix = event.quantity > 1 ? ` x${event.quantity}` : '';
      addMessage(t('event.item', { name: item?.name ?? event.itemId, suffix }));
    } else if (event.kind === 'equipped') {
      addMessage(t('event.equipped', { name: itemName(event.itemId) }));
    } else if (event.kind === 'unequipped') {
      addMessage(t('event.unequipped', { name: itemName(event.itemId) }));
    } else if (event.kind === 'item-used') {
      addMessage(t('event.itemUsed', { name: itemName(event.itemId), heal: event.heal }));
    } else if (event.kind === 'item-destroyed') {
      const suffix = event.quantity > 1 ? ` x${event.quantity}` : '';
      addMessage(t('event.itemDestroyed', { name: itemName(event.itemId), suffix }));
    } else if (event.kind === 'heal') {
      addMessage(t('event.heal', { amount: event.amount }));
    } else if (event.kind === 'restore') {
      addMessage(t('event.restore', { amount: event.amount }));
    } else if (event.kind === 'buff') {
      addMessage(t('event.buff', { seconds: event.seconds }));
    } else if (event.kind === 'item-failed') {
      addMessage(failureText('item', event.reason));
    } else if (event.kind === 'home-bound') {
      addMessage(t('event.homeBound', { zone: zoneLabel(event.zoneId) }));
    } else if (event.kind === 'home-already') {
      addMessage(t('event.homeAlready', { zone: zoneLabel(event.zoneId) }));
    } else if (event.kind === 'hearth-cancelled') {
      addMessage(t('event.hearthCancelled'));
    } else if (event.kind === 'hearth-failed') {
      addMessage(t(`failure.hearth.${event.reason}`, { seconds: event.seconds ?? 0 }));
    } else if (event.kind === 'quest-accepted') {
      addMessage(t('event.questAccepted', { name: event.name }));
    } else if (event.kind === 'quest-progress') {
      addMessage(t('event.questProgress', { label: event.label, current: event.current, target: event.target }));
    } else if (event.kind === 'quest-ready') {
      addMessage(t('event.questReady', { name: event.name }));
    } else if (event.kind === 'quest-completed') {
      addMessage(t('event.questCompleted', { name: event.name }));
    } else if (event.kind === 'quest-abandoned') {
      addMessage(t('event.questAbandoned', { name: event.name }));
    } else if (event.kind === 'quest-failed') {
      addMessage(failureText('quest', event.reason));
    } else if (event.kind === 'npc-failed') {
      addMessage(failureText('npc', event.reason));
    } else if (event.kind === 'vendor-failed') {
      addMessage(failureText('vendor', event.reason));
    } else if (event.kind === 'purchased') {
      const suffix = event.quantity > 1 ? ` x${event.quantity}` : '';
      addMessage(t('event.purchased', { name: itemName(event.itemId), suffix, cost: event.cost }));
    } else if (event.kind === 'sold') {
      const suffix = event.quantity > 1 ? ` x${event.quantity}` : '';
      addMessage(t('event.sold', { name: itemName(event.itemId), suffix, gold: event.gold }));
    } else if (event.kind === 'inventory-full') {
      addMessage(t('event.inventoryFull'));
    } else if (event.kind === 'loot-failed') {
      addMessage(failureText('loot', event.reason));
    } else if (event.kind === 'levelup') {
      addMessage(t('event.levelUp', { level: event.level }));
    } else if (event.kind === 'ability-failed') {
      addMessage(failureText('ability', event.reason));
    }
  }

  function updateAbilitySlots() {
    for (const slot of abilitySlots) {
      const remaining = state.player.cooldowns?.[slot.ability.id] ?? 0;
      const ratio = slot.ability.cooldown > 0 ? Math.min(1, remaining / slot.ability.cooldown) : 0;

      slot.cooldownEl.style.height = `${ratio * 100}%`;
      slot.cooldownTextEl.textContent = remaining > 0 ? Math.ceil(remaining) : '';
      slot.element.classList.toggle('slot-unaffordable', state.player.resource < slot.ability.cost);
    }
  }

  function update() {
    playerName.textContent = state.player.name || '—';
    playerLevel.textContent = state.player.level;

    playerHealthFill.style.width = `${toPercent(state.player.health, state.player.healthMax)}%`;
    playerHealthText.textContent = `${Math.round(state.player.health)} / ${state.player.healthMax}`;

    playerResourceFill.style.width = `${toPercent(state.player.resource, state.player.resourceMax)}%`;
    playerResourceText.textContent = `${Math.round(state.player.resource)} / ${state.player.resourceMax}`;

    xpFill.style.width = `${toPercent(state.player.xp, state.player.xpToNextLevel)}%`;

    goldAmount.textContent = formatNumber(state.player.gold);

    zoneName.textContent = state.zoneName;

    updateAbilitySlots();
    updateItemSlots();
    updateCast();

    if (state.target) {
      targetFrame.classList.remove('hidden');
      targetName.textContent = state.target.name;
      targetLevel.textContent = state.target.level;
      targetHealthFill.style.width = `${toPercent(state.target.health, state.target.healthMax)}%`;
      targetInvite.classList.add('hidden');
      targetGuildInvite.classList.add('hidden');
    } else if (state.playerTargetData) {
      targetFrame.classList.remove('hidden');
      targetName.textContent = state.playerTargetData.characterName ?? '???';
      targetLevel.textContent = state.playerTargetData.level ?? '?';
      targetHealthFill.style.width = `${toPercent(state.playerTargetData.health, state.playerTargetData.healthMax)}%`;
      targetInvite.classList.toggle('hidden', !state.canInviteTarget);
      targetGuildInvite.classList.toggle('hidden', !state.canGuildInviteTarget);
      targetGuildKick.classList.toggle('hidden', !state.canGuildKickTarget);
    } else {
      targetInvite.classList.add('hidden');
      targetGuildInvite.classList.add('hidden');
      targetFrame.classList.add('hidden');
    }
  }

  return { update, setAbilities, setCrouch, setQuests, addEvent, startCast, stopCast };
}
