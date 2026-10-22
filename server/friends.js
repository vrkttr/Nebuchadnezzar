export const MAX_FRIENDS = 50;
const MAX_ONLINE_LISTED = 200;
const REQUEST_INTERVAL_MS = 700;

function system(text, key, params) {
  return { type: 'chat', channel: 'system', text, key, params };
}

export async function loadFriends(db, characterId) {
  const [rows] = await db.query(
    'SELECT f.friend_id, c.name FROM character_friends f JOIN characters c ON c.id = f.friend_id WHERE f.character_id = ?',
    [characterId]
  );
  return new Map(rows.map((row) => [row.friend_id, row.name]));
}

function playerByCharacter(players, characterId) {
  for (const [playerId, state] of players) {
    if (state.characterId === characterId) return { playerId, state };
  }
  return null;
}

export function serializeSocial(players, player) {
  const online = [];

  for (const [playerId, state] of players) {
    if (state.characterId === player.characterId) continue;
    online.push({
      id: playerId,
      name: state.characterName,
      level: state.level,
      zoneId: state.zoneId,
      guildName: state.guildName ?? null,
      friend: player.friends.has(state.characterId),
      inGroup: Boolean(state.groupId),
    });
  }

  online.sort((a, b) => a.name.localeCompare(b.name, 'de'));

  const friends = [...player.friends].map(([characterId, name]) => {
    const found = playerByCharacter(players, characterId);
    return {
      name,
      online: Boolean(found),
      id: found ? found.playerId : null,
      level: found ? found.state.level : null,
      zoneId: found ? found.state.zoneId : null,
    };
  });

  friends.sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name, 'de'));

  return {
    type: 'social',
    online: online.slice(0, MAX_ONLINE_LISTED),
    onlineTotal: online.length,
    friends,
    groupId: player.groupId ?? null,
  };
}

export function sendSocial(players, playerId, notify) {
  const player = players.get(playerId);
  if (!player) return;
  notify(playerId, serializeSocial(players, player));
}

export function requestSocial(players, playerId, notify, now = Date.now()) {
  const player = players.get(playerId);
  if (!player || now - (player.socialAt ?? 0) < REQUEST_INTERVAL_MS) return;
  player.socialAt = now;
  notify(playerId, serializeSocial(players, player));
}

export async function addFriend(db, players, playerId, rawName, notify) {
  const player = players.get(playerId);
  if (!player || typeof rawName !== 'string') return;

  const name = rawName.trim();
  if (name.length < 3 || name.length > 20) {
    notify(playerId, system('Charakter nicht gefunden.', 'friends.notFound'));
    return;
  }

  if (player.friendBusy) return;
  player.friendBusy = true;

  try {
    if (player.friends.size >= MAX_FRIENDS) {
      notify(playerId, system('Deine Freundesliste ist voll.', 'friends.full', { max: MAX_FRIENDS }));
      return;
    }

    const [rows] = await db.query('SELECT id, name FROM characters WHERE name = ?', [name]);
    const target = rows[0];

    if (!target) {
      notify(playerId, system('Charakter nicht gefunden.', 'friends.notFound'));
      return;
    }

    if (target.id === player.characterId) {
      notify(playerId, system('Du kannst dich nicht selbst hinzufügen.', 'friends.self'));
      return;
    }

    if (player.friends.has(target.id)) {
      notify(playerId, system(`${target.name} ist bereits in deiner Freundesliste.`, 'friends.already', { name: target.name }));
      return;
    }

    await db.query('INSERT IGNORE INTO character_friends (character_id, friend_id) VALUES (?, ?)', [player.characterId, target.id]);
    player.friends.set(target.id, target.name);
    notify(playerId, system(`${target.name} wurde zu deiner Freundesliste hinzugefügt.`, 'friends.added', { name: target.name }));
    sendSocial(players, playerId, notify);
  } catch (error) {
    console.error('Fehler beim Hinzufügen eines Freundes:', error);
  } finally {
    player.friendBusy = false;
  }
}

export async function removeFriend(db, players, playerId, rawName, notify) {
  const player = players.get(playerId);
  if (!player || typeof rawName !== 'string') return;

  const entry = [...player.friends].find(([, name]) => name === rawName);
  if (!entry) return;

  try {
    await db.query('DELETE FROM character_friends WHERE character_id = ? AND friend_id = ?', [player.characterId, entry[0]]);
    player.friends.delete(entry[0]);
    notify(playerId, system(`${entry[1]} wurde aus deiner Freundesliste entfernt.`, 'friends.removed', { name: entry[1] }));
    sendSocial(players, playerId, notify);
  } catch (error) {
    console.error('Fehler beim Entfernen eines Freundes:', error);
  }
}

export function announcePresence(players, joinedPlayerId, online, notify) {
  const joined = players.get(joinedPlayerId);
  if (!joined) return;

  for (const [playerId, state] of players) {
    if (playerId === joinedPlayerId || !state.friends.has(joined.characterId)) continue;
    notify(
      playerId,
      online
        ? system(`${joined.characterName} ist jetzt online.`, 'friends.cameOnline', { name: joined.characterName })
        : system(`${joined.characterName} ist jetzt offline.`, 'friends.wentOffline', { name: joined.characterName })
    );
  }
}
