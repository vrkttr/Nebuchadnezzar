import { t, tOr, formatNumber } from '../i18n/I18n.js';

export function slotLabel(slot) {
  return tOr([`item.slot.${slot}`], slot);
}

const CURSOR_OFFSET = 14;
const VIEWPORT_MARGIN = 8;

export function createTooltip(state) {
  const element = document.getElementById('tooltip');

  function move(event) {
    const rect = element.getBoundingClientRect();
    let x = event.clientX + CURSOR_OFFSET;
    let y = event.clientY + CURSOR_OFFSET;

    if (x + rect.width > window.innerWidth - VIEWPORT_MARGIN) {
      x = event.clientX - rect.width - CURSOR_OFFSET;
    }

    if (y + rect.height > window.innerHeight - VIEWPORT_MARGIN) {
      y = event.clientY - rect.height - CURSOR_OFFSET;
    }

    element.style.left = `${Math.max(VIEWPORT_MARGIN, x)}px`;
    element.style.top = `${Math.max(VIEWPORT_MARGIN, y)}px`;
  }

  function show(lines, event) {
    element.replaceChildren(
      ...lines.map(([text, className]) => {
        const line = document.createElement('div');
        line.className = className;
        line.textContent = text;
        return line;
      })
    );

    element.classList.remove('hidden');
    move(event);
  }

  function hide() {
    element.classList.add('hidden');
  }

  function itemLines(item, quantity) {
    if (!item) return [[t('item.unknown'), 'tooltip-name']];

    const typeLabel = tOr([`item.type.${item.type}`], item.type);
    const lines = [
      [item.name, `tooltip-name quality-text-${item.quality}`],
      [item.type === 'armor' ? `${typeLabel} – ${slotLabel(item.slot)}` : typeLabel, 'tooltip-dim'],
    ];

    if (item.stats?.damageMin !== undefined) {
      lines.push([t('tooltip.damage', { min: item.stats.damageMin, max: item.stats.damageMax }), 'tooltip-stat']);
    }

    if (item.ranged) {
      lines.push([t('tooltip.ranged', { range: item.ranged.range, rate: formatNumber(1 / item.ranged.interval, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }), 'tooltip-stat']);
      lines.push([t('tooltip.ammo', { name: state.items[item.ranged.ammo]?.name ?? item.ranged.ammo }), 'tooltip-dim']);
    }

    if (item.stats?.armor) {
      lines.push([t('tooltip.armor', { armor: item.stats.armor }), 'tooltip-stat']);
    }

    if (item.slot) {
      lines.push([
        t('tooltip.requiresLevel', { level: item.level }),
        state.player.level < item.level ? 'tooltip-bad' : 'tooltip-dim',
      ]);
    }

    if (item.use?.heal) {
      lines.push([t('tooltip.useHeal', { heal: item.use.heal }), 'tooltip-use']);
    }

    if (item.use?.hearth) {
      lines.push([t('tooltip.useHearth'), 'tooltip-use']);
      lines.push([
        state.home?.zoneId
          ? t('tooltip.homeBound', { zone: tOr([`zone.${state.home.zoneId}.name`], state.home.zoneId) })
          : t('tooltip.homeUnbound'),
        'tooltip-dim',
      ]);
    }

    if (item.description) {
      lines.push([item.description, 'tooltip-desc']);
    }

    if (item.value > 0) {
      lines.push([t('tooltip.value', { value: item.value }), 'tooltip-dim']);
    }

    if (item.stackSize > 1) {
      lines.push([
        quantity ? t('tooltip.stack', { quantity, max: item.stackSize }) : t('tooltip.maxStack', { max: item.stackSize }),
        'tooltip-dim',
      ]);
    }

    return lines;
  }

  function showItem(itemId, quantity, event) {
    show(itemLines(state.items[itemId], quantity), event);
  }

  function abilityEffectLine(ability) {
    if (ability.kind === 'heal') return t('tooltip.abilityHeal', { percent: Math.round(ability.healPercent * 100) });
    if (ability.kind === 'resource') return t('tooltip.abilityRestore', { amount: ability.restore });
    if (ability.kind === 'buff') {
      return t('tooltip.abilityBuff', { percent: Math.round(ability.damageReduction * 100), seconds: ability.duration });
    }
    return t('tooltip.abilityDamage', { percent: Math.round(ability.damageMultiplier * 100) });
  }

  function showAbility(ability, event) {
    let costLine;
    if (ability.kind === 'ranged') {
      costLine = t('tooltip.abilityCostRanged', { cost: ability.cost });
    } else if (ability.range > 0) {
      costLine = t('tooltip.abilityCost', { cost: ability.cost, range: ability.range });
    } else {
      costLine = t('tooltip.abilityCostSelf', { cost: ability.cost });
    }

    const lines = [
      [ability.name, 'tooltip-name tooltip-ability'],
      [costLine, 'tooltip-dim'],
      [t('tooltip.cooldown', { seconds: ability.cooldown }), 'tooltip-dim'],
      [abilityEffectLine(ability), 'tooltip-stat'],
    ];

    if (ability.stunSeconds) {
      lines.push([t('tooltip.abilityStun', { seconds: ability.stunSeconds }), 'tooltip-stat']);
    }

    if (ability.description) {
      lines.push([ability.description, 'tooltip-desc']);
    }

    show(lines, event);
  }

  return { showItem, showAbility, move, hide };
}
