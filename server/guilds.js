import { addGold } from './loot.js';

export const GUILD_NAME_MIN = 3;
export const GUILD_NAME_MAX = 20;
export const GUILD_FOUNDING_COST = 10000;
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

function setGuild(state, guildId, guildName, leaderId = null) {
  state.guildId = guildId;
  state.guildName = guildName;
  state.guildLeaderId = leaderId;
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

  if (player.gold < GUILD_FOUNDING_COST) {
    notify(playerId, system(`Die Gründung einer Gilde kostet ${GUILD_FOUNDING_COST} Gold.`, 'guild.noGold', { cost: GUILD_FOUNDING_COST }));
    return false;
  }

  if (player.guildBusy) return false;
  player.guildBusy = true;

  try {
    const [result] = await db.query('INSERT INTO guilds (name, leader_id) VALUES (?, ?)', [name, player.characterId]);
    if (player.gold < GUILD_FOUNDING_COST || player.guildId) {
      await db.query('DELETE FROM guilds WHERE id = ?', [result.insertId]);
      notify(playerId, system(`Die Gründung einer Gilde kostet ${GUILD_FOUNDING_COST} Gold.`, 'guild.noGold', { cost: GUILD_FOUNDING_COST }));
      return false;
    }

    await db.query('UPDATE characters SET guild_id = ? WHERE id = ?', [result.insertId, player.characterId]);
    addGold(player, -GUILD_FOUNDING_COST);
    player.dataVersion += 1;
    setGuild(player, result.insertId, name, player.characterId);
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

  const [rows] = await db.query('SELECT id, leader_id FROM guilds WHERE id = ?', [invite.guildId]);
  if (rows.length === 0 || !players.has(playerId)) return;

  await db.query('UPDATE characters SET guild_id = ? WHERE id = ?', [invite.guildId, player.characterId]);
  setGuild(player, invite.guildId, invite.guildName, rows[0].leader_id ?? null);
  notifyMembers(players, invite.guildId, notify, system(`${player.characterName} ist der Gilde beigetreten.`, 'guild.memberJoined', { name: player.characterName }));
}

async function removeMember(db, players, guildId, guildName, member, notify) {
  const wasLeader = member.guildLeaderId === member.characterId;
  await db.query('UPDATE characters SET guild_id = NULL WHERE id = ?', [member.characterId]);
  setGuild(member, null, null);

  const [rows] = await db.query('SELECT COUNT(*) AS members FROM characters WHERE guild_id = ?', [guildId]);
  if (Number(rows[0].members) === 0) {
    await db.query('DELETE FROM guilds WHERE id = ?', [guildId]);
    return;
  }

  if (!wasLeader) return;

  const [next] = await db.query('SELECT id FROM characters WHERE guild_id = ? ORDER BY id LIMIT 1', [guildId]);
  const leaderId = next[0].id;
  await db.query('UPDATE guilds SET leader_id = ? WHERE id = ?', [leaderId, guildId]);
  for (const other of players.values()) {
    if (other.guildId === guildId) other.guildLeaderId = leaderId;
  }
  notifyMembers(players, guildId, notify, system('Die Gildenführung wurde neu vergeben.', 'guild.leaderChanged'));
}

export async function kickFromGuild(db, players, leaderPlayerId, targetId, notify) {
  const leader = players.get(leaderPlayerId);
  const target = players.get(targetId);
  if (!leader?.guildId || !target || leaderPlayerId === targetId) return false;
  if (leader.guildLeaderId !== leader.characterId || target.guildId !== leader.guildId) return false;

  const guildId = leader.guildId;
  const guildName = leader.guildName;
  await removeMember(db, players, guildId, guildName, target, notify);
  notify(targetId, system(`Du wurdest aus der Gilde ${guildName} entfernt.`, 'guild.kicked', { name: guildName }));
  notifyMembers(players, guildId, notify, system(`${target.characterName} wurde aus der Gilde entfernt.`, 'guild.memberKicked', { name: target.characterName }));
  return true;
}

export async function leaveGuild(db, players, playerId, notify) {
  const player = players.get(playerId);
  if (!player?.guildId) return false;

  const guildId = player.guildId;
  const guildName = player.guildName;
  await removeMember(db, players, guildId, guildName, player, notify);
  notify(playerId, system(`Du hast die Gilde ${guildName} verlassen.`, 'guild.left', { name: guildName }));
  notifyMembers(players, guildId, notify, system(`${player.characterName} hat die Gilde verlassen.`, 'guild.memberLeft', { name: player.characterName }));

  return true;
}
