const TYPE_LABELS = {
  material: 'Material',
  consumable: 'Verbrauchsgut',
  weapon: 'Waffe',
  armor: 'Rüstung',
};

export const SLOT_LABELS = {
  weapon: 'Waffe',
  head: 'Kopf',
  chest: 'Brust',
  legs: 'Beine',
};

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
    if (!item) return [['Unbekannter Gegenstand', 'tooltip-name']];

    const typeLabel = TYPE_LABELS[item.type] ?? item.type;
    const lines = [
      [item.name, `tooltip-name quality-text-${item.quality}`],
      [item.type === 'armor' ? `${typeLabel} – ${SLOT_LABELS[item.slot]}` : typeLabel, 'tooltip-dim'],
    ];

    if (item.stats?.damageMin !== undefined) {
      lines.push([`Schaden: ${item.stats.damageMin}–${item.stats.damageMax}`, 'tooltip-stat']);
    }

    if (item.stats?.armor) {
      lines.push([`Rüstung: ${item.stats.armor}`, 'tooltip-stat']);
    }

    if (item.slot) {
      lines.push([
        `Benötigt Level ${item.level}`,
        state.player.level < item.level ? 'tooltip-bad' : 'tooltip-dim',
      ]);
    }

    if (item.use?.heal) {
      lines.push([`Benutzen: Stellt ${item.use.heal} Gesundheit wieder her.`, 'tooltip-use']);
    }

    if (item.description) {
      lines.push([item.description, 'tooltip-desc']);
    }

    if (item.stackSize > 1) {
      lines.push([
        quantity ? `Stapel: ${quantity} / ${item.stackSize}` : `Max. Stapel: ${item.stackSize}`,
        'tooltip-dim',
      ]);
    }

    return lines;
  }

  function showItem(itemId, quantity, event) {
    show(itemLines(state.items[itemId], quantity), event);
  }

  function showAbility(ability, event) {
    const lines = [
      [ability.name, 'tooltip-name tooltip-ability'],
      [`${ability.cost} Energie · ${ability.range} m Reichweite`, 'tooltip-dim'],
      [`Abklingzeit: ${ability.cooldown} s`, 'tooltip-dim'],
      [`Verursacht ${Math.round(ability.damageMultiplier * 100)} % Schaden.`, 'tooltip-stat'],
    ];

    if (ability.description) {
      lines.push([ability.description, 'tooltip-desc']);
    }

    show(lines, event);
  }

  return { showItem, showAbility, move, hide };
}
