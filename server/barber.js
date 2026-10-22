import { APPEARANCE_LIMITS } from './appearance.js';
import { addGold } from './loot.js';

export const BARBER_COST = 150;

function system(text, key, params) {
  return { type: 'chat', channel: 'system', text, key, params };
}

function parseAppearance(raw) {
  if (!Array.isArray(raw) || raw.length !== APPEARANCE_LIMITS.length) return null;

  const values = raw.map(Number);
  const valid = values.every((value, index) => Number.isInteger(value) && value >= 0 && value < APPEARANCE_LIMITS[index]);
  return valid ? values : null;
}

export async function applyBarber(db, player, playerId, rawAppearance, notify) {
  const next = parseAppearance(rawAppearance);
  if (!next) return false;

  if (next.every((value, index) => value === player.appearance[index])) {
    notify(playerId, system('Dein Aussehen ist bereits so.', 'barber.unchanged'));
    return false;
  }

  if (player.gold < BARBER_COST) {
    notify(playerId, system(`Der Barbier verlangt ${BARBER_COST} Gold.`, 'barber.noGold', { cost: BARBER_COST }));
    return false;
  }

  if (player.barberBusy) return false;
  player.barberBusy = true;

  try {
    await db.query(
      'UPDATE characters SET appear_skin = ?, appear_hair_style = ?, appear_hair_color = ?, appear_top = ?, appear_pants = ? WHERE id = ?',
      [...next, player.characterId]
    );

    if (player.gold < BARBER_COST) {
      notify(playerId, system(`Der Barbier verlangt ${BARBER_COST} Gold.`, 'barber.noGold', { cost: BARBER_COST }));
      return false;
    }

    player.appearance = next;
    addGold(player, -BARBER_COST);
    player.dataVersion += 1;
    notify(playerId, { type: 'appearance', appearance: next });
    notify(playerId, system('Der Barbier hat ganze Arbeit geleistet.', 'barber.done'));
    return true;
  } catch (error) {
    console.error('Fehler beim Ändern des Aussehens:', error);
    return false;
  } finally {
    player.barberBusy = false;
  }
}
