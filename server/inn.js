export const HEARTHSTONE_ID = 'hearthstone';
export const HEARTH_CAST_MS = 10000;
export const HEARTH_COOLDOWN_MS = 30 * 60 * 1000;
export const HEARTH_SPAWN_ID = 'heimstein';

function event(notify, playerId, kind, extra = {}) {
  notify(playerId, { type: 'event', kind, ...extra });
}

function hearthFail(notify, playerId, reason, extra = {}) {
  event(notify, playerId, 'hearth-failed', { reason, ...extra });
}

function hasHearthstone(player) {
  return player.inventory.some((stack) => stack && stack.itemId === HEARTHSTONE_ID);
}

export function serializeHome(player) {
  return { type: 'home', zoneId: player.homeZone ?? null, readyAt: player.hearthReadyAt || 0 };
}

export async function bindHome(db, player, playerId, zoneId, notify) {
  if (player.dead) return false;

  if (player.homeZone === zoneId) {
    event(notify, playerId, 'home-already', { zoneId });
    return false;
  }

  try {
    await db.query('UPDATE characters SET home_zone = ? WHERE id = ?', [zoneId, player.characterId]);
  } catch (error) {
    console.error('Fehler beim Binden des Heimsteins:', error);
    return false;
  }

  player.homeZone = zoneId;
  player.dataVersion += 1;
  event(notify, playerId, 'home-bound', { zoneId });
  notify(playerId, serializeHome(player));
  return true;
}

export function cancelHearth(player, playerId, notify, reason = 'cancelled') {
  if (!player.hearth) return;

  player.hearth = null;
  notify(playerId, { type: 'hearth', state: 'stop', reason });
}

export function startHearth(player, playerId, notify) {
  if (player.dead) return false;
  if (player.hearth) return hearthFail(notify, playerId, 'casting'), false;
  if (!hasHearthstone(player)) return hearthFail(notify, playerId, 'no-item'), false;
  if (!player.homeZone) return hearthFail(notify, playerId, 'not-bound'), false;
  if (player.combatTimer < 6) return hearthFail(notify, playerId, 'combat'), false;

  const now = Date.now();
  if (now < player.hearthReadyAt) {
    return hearthFail(notify, playerId, 'cooldown', { seconds: Math.ceil((player.hearthReadyAt - now) / 1000) }), false;
  }

  player.hearth = { endsAt: now + HEARTH_CAST_MS, health: player.health, zoneId: player.zoneId };
  notify(playerId, { type: 'hearth', state: 'start', duration: HEARTH_CAST_MS, zoneId: player.homeZone });
  return true;
}

export function updateHearth(players, notify, teleport, persist) {
  const now = Date.now();

  for (const [playerId, player] of players) {
    const cast = player.hearth;
    if (!cast) continue;

    if (player.dead) {
      cancelHearth(player, playerId, notify, 'dead');
      continue;
    }

    const input = player.input;
    const moved = input.moveX !== 0 || input.moveZ !== 0 || input.jump || !player.isGrounded;

    if (moved) {
      cancelHearth(player, playerId, notify, 'moved');
      continue;
    }

    if (player.health < cast.health || player.combatTimer < 1) {
      cancelHearth(player, playerId, notify, 'damaged');
      continue;
    }

    cast.health = player.health;

    if (now < cast.endsAt) continue;

    player.hearth = null;

    if (!hasHearthstone(player) || !player.homeZone) {
      notify(playerId, { type: 'hearth', state: 'stop', reason: 'cancelled' });
      continue;
    }

    player.hearthReadyAt = now + HEARTH_COOLDOWN_MS;
    notify(playerId, { type: 'hearth', state: 'stop', reason: 'done' });
    notify(playerId, serializeHome(player));
    teleport(playerId, player, player.homeZone, HEARTH_SPAWN_ID);
    persist(player);
  }
}
