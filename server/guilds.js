export const GUILD_NAME_MIN = 3;
export const GUILD_NAME_MAX = 20;
const INVITE_TIMEOUT_MS = 30000;
const NAME_PATTERN = /^\p{L}+$/u;

function system(text, key, params) {
  return { type: 'chat', channel: 'system', text, key, params };
}

export function isValidGuildName(name) {
  return (
    typeof name === 'string' &&
    name.length >= GUILD_NAME_MIN &&
    name.length <= GUILD_NAME_MAX &&
    NAME_PATTERN.test(name)
  );
}

function setGuild(state, guildId, guildName) {
  state.guildId = guildId;
  state.guildName = guildName;
}

function notifyMembers(players, guildId, notify, message) {
  for (const [id, player] of players) {
    if (player.guildId === guildId) notify(id, message);
  }
}

export async function createGuild(db, players, playerId, rawName, notify) {
  const player = players.get(playerId);
  if (!player) return false;

  if (player.guildId) {
    notify(playerId, system('Du bist bereits in einer Gilde.', 'guild.alreadyIn'));
    return false;
  }

  const name = typeof rawName === 'string' ? rawName.trim() : '';
  if (!isValidGuildName(name)) {
    notify(playerId, system('Der Gildenname muss 3 bis 20 Buchstaben lang sein und darf nur Buchstaben enthalten.', 'guild.nameInvalid'));
    return false;
  }

  if (player.guildBusy) return false;
  player.guildBusy = true;

  try {
    const [result] = await db.query('INSERT INTO guilds (name) VALUES (?)', [name]);
    await db.query('UPDATE characters SET guild_id = ? WHERE id = ?', [result.insertId, player.characterId]);
    setGuild(player, result.insertId, name);
    notify(playerId, system(`Die Gilde ${name} wurde gegründet.`, 'guild.created', { name }));
    return true;
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      notify(playerId, system('Dieser Gildenname ist bereits vergeben.', 'guild.nameTaken'));
    } else {
      console.error('Fehler beim Gründen der Gilde:', error);
    }
    return false;
  } finally {
    player.guildBusy = false;
  }
}

export function inviteToGuild(players, inviterId, targetId, notify, now = Date.now()) {
  const inviter = players.get(inviterId);
  const target = players.get(targetId);
  if (!inviter || !target || inviterId === targetId || !inviter.guildId) return;
  if (target.zoneId !== inviter.zoneId) return;

  if (target.guildId) {
    notify(inviterId, system(`${target.characterName} ist bereits in einer Gilde.`, 'guild.targetInGuild', { name: target.characterName }));
    return;
  }

  if (target.pendingGuildInvite && target.pendingGuildInvite.expiresAt > now) {
    notify(inviterId, system(`${target.characterName} hat bereits eine Einladung.`, 'group.targetBusy', { name: target.characterName }));
    return;
  }

  target.pendingGuildInvite = { guildId: inviter.guildId, guildName: inviter.guildName, fromId: inviterId, expiresAt: now + INVITE_TIMEOUT_MS };
  notify(targetId, { type: 'guild-invite', fromName: inviter.characterName, guildName: inviter.guildName });
  notify(inviterId, system(`Gildeneinladung an ${target.characterName} gesendet.`, 'guild.inviteSent', { name: target.characterName }));
}

export async function answerGuildInvite(db, players, playerId, accept, notify, now = Date.now()) {
  const player = players.get(playerId);
  const invite = player?.pendingGuildInvite;
  if (!player || !invite) return;
  player.pendingGuildInvite = null;

  if (!accept) {
    notify(invite.fromId, system(`${player.characterName} hat die Gildeneinladung abgelehnt.`, 'group.declined', { name: player.characterName }));
    return;
  }

  if (invite.expiresAt <= now || player.guildId) return;

  const [rows] = await db.query('SELECT id FROM guilds WHERE id = ?', [invite.guildId]);
  if (rows.length === 0 || !players.has(playerId)) return;

  await db.query('UPDATE characters SET guild_id = ? WHERE id = ?', [invite.guildId, player.characterId]);
  setGuild(player, invite.guildId, invite.guildName);
  notifyMembers(players, invite.guildId, notify, system(`${player.characterName} ist der Gilde beigetreten.`, 'guild.memberJoined', { name: player.characterName }));
}

export async function leaveGuild(db, players, playerId, notify) {
  const player = players.get(playerId);
  if (!player?.guildId) return false;

  const guildId = player.guildId;
  const guildName = player.guildName;
  await db.query('UPDATE characters SET guild_id = NULL WHERE id = ?', [player.characterId]);
  setGuild(player, null, null);
  notify(playerId, system(`Du hast die Gilde ${guildName} verlassen.`, 'guild.left', { name: guildName }));
  notifyMembers(players, guildId, notify, system(`${player.characterName} hat die Gilde verlassen.`, 'guild.memberLeft', { name: player.characterName }));

  const [rows] = await db.query('SELECT COUNT(*) AS members FROM characters WHERE guild_id = ?', [guildId]);
  if (Number(rows[0].members) === 0) {
    await db.query('DELETE FROM guilds WHERE id = ?', [guildId]);
  }

  return true;
}
