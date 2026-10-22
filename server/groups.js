import { randomUUID } from 'node:crypto';

export const MAX_GROUP_SIZE = 5;
const INVITE_TIMEOUT_MS = 30000;

export function createGroups() {
  return { groups: new Map() };
}

function system(text, key, params) {
  return { type: 'chat', channel: 'system', text, key, params };
}

function memberStates(groups, players, group) {
  return group.members
    .map((memberId) => {
      const member = players.get(memberId);
      if (!member) return null;
      return {
        id: memberId,
        name: member.characterName,
        level: member.level,
        health: member.health,
        healthMax: member.healthMax,
        dead: Boolean(member.dead),
        zoneId: member.zoneId,
      };
    })
    .filter(Boolean);
}

export function serializeGroup(groups, players, groupId) {
  const group = groups.groups.get(groupId);
  if (!group) return null;
  return { leaderId: group.leaderId, members: memberStates(groups, players, group) };
}

export function sendGroupState(groups, players, groupId, notify) {
  const group = groups.groups.get(groupId);
  if (!group) return;
  const payload = { type: 'group', ...serializeGroup(groups, players, groupId) };
  const key = JSON.stringify(payload);
  if (group.lastKey === key) return;
  group.lastKey = key;
  for (const memberId of group.members) notify(memberId, payload);
}

export function updateGroups(groups, players, notify) {
  for (const groupId of groups.groups.keys()) sendGroupState(groups, players, groupId, notify);
}

function clearGroup(players, notify, playerId) {
  const player = players.get(playerId);
  if (player) player.groupId = null;
  notify(playerId, { type: 'group', leaderId: null, members: [] });
}

export function leaveGroup(groups, players, playerId, notify, reason = 'left') {
  const player = players.get(playerId);
  const groupId = player?.groupId;
  const group = groupId ? groups.groups.get(groupId) : null;
  if (!group) {
    if (player) player.groupId = null;
    return;
  }

  group.members = group.members.filter((memberId) => memberId !== playerId);
  if (player) {
    clearGroup(players, notify, playerId);
    if (reason === 'kicked') notify(playerId, system('Du wurdest aus der Gruppe entfernt.', 'group.kickedSelf'));
    else notify(playerId, system('Du hast die Gruppe verlassen.', 'group.leftSelf'));
  }

  for (const memberId of group.members) {
    notify(memberId, system(`${player?.characterName ?? '???'} hat die Gruppe verlassen.`, 'group.memberLeft', { name: player?.characterName ?? '???' }));
  }

  if (group.members.length < 2) {
    for (const memberId of group.members) {
      clearGroup(players, notify, memberId);
      notify(memberId, system('Die Gruppe wurde aufgelöst.', 'group.disbanded'));
    }
    groups.groups.delete(group.id);
    return;
  }

  if (group.leaderId === playerId) group.leaderId = group.members[0];
  group.lastKey = null;
  sendGroupState(groups, players, group.id, notify);
}

export function invitePlayer(groups, players, inviterId, targetId, notify, now = Date.now()) {
  const inviter = players.get(inviterId);
  const target = players.get(targetId);
  if (!inviter || !target || inviterId === targetId) return;

  if (inviter.groupId) {
    const group = groups.groups.get(inviter.groupId);
    if (!group || group.leaderId !== inviterId) {
      notify(inviterId, system('Nur der Gruppenleiter kann einladen.', 'group.notLeader'));
      return;
    }
    if (group.members.length >= MAX_GROUP_SIZE) {
      notify(inviterId, system('Die Gruppe ist voll.', 'group.full'));
      return;
    }
  }

  if (target.groupId) {
    notify(inviterId, system(`${target.characterName} ist bereits in einer Gruppe.`, 'group.targetInGroup', { name: target.characterName }));
    return;
  }

  if (target.pendingInvite && target.pendingInvite.expiresAt > now) {
    notify(inviterId, system(`${target.characterName} hat bereits eine Einladung.`, 'group.targetBusy', { name: target.characterName }));
    return;
  }

  target.pendingInvite = { fromId: inviterId, expiresAt: now + INVITE_TIMEOUT_MS };
  notify(targetId, { type: 'group-invite', fromId: inviterId, fromName: inviter.characterName });
  notify(inviterId, system(`Einladung an ${target.characterName} gesendet.`, 'group.inviteSent', { name: target.characterName }));
}

export function answerInvite(groups, players, playerId, accept, notify, now = Date.now()) {
  const player = players.get(playerId);
  const invite = player?.pendingInvite;
  if (!player || !invite) return;
  player.pendingInvite = null;

  const inviter = players.get(invite.fromId);
  if (!inviter) return;

  if (!accept || invite.expiresAt <= now) {
    if (!accept) notify(invite.fromId, system(`${player.characterName} hat die Einladung abgelehnt.`, 'group.declined', { name: player.characterName }));
    return;
  }

  if (player.groupId) return;

  let group = inviter.groupId ? groups.groups.get(inviter.groupId) : null;
  if (inviter.groupId && (!group || group.leaderId !== invite.fromId)) return;

  if (group && group.members.length >= MAX_GROUP_SIZE) {
    notify(playerId, system('Die Gruppe ist voll.', 'group.full'));
    return;
  }

  if (!group) {
    group = { id: randomUUID(), leaderId: invite.fromId, members: [invite.fromId], lastKey: null };
    groups.groups.set(group.id, group);
    inviter.groupId = group.id;
  }

  group.members.push(playerId);
  player.groupId = group.id;
  group.lastKey = null;

  for (const memberId of group.members) {
    notify(memberId, system(`${player.characterName} ist der Gruppe beigetreten.`, 'group.memberJoined', { name: player.characterName }));
  }
  sendGroupState(groups, players, group.id, notify);
}

export function kickMember(groups, players, leaderId, targetId, notify) {
  const leader = players.get(leaderId);
  const group = leader?.groupId ? groups.groups.get(leader.groupId) : null;
  if (!group || group.leaderId !== leaderId || targetId === leaderId) return;
  if (!group.members.includes(targetId)) return;
  leaveGroup(groups, players, targetId, notify, 'kicked');
}

export function promoteMember(groups, players, leaderId, targetId, notify) {
  const leader = players.get(leaderId);
  const group = leader?.groupId ? groups.groups.get(leader.groupId) : null;
  if (!group || group.leaderId !== leaderId || !group.members.includes(targetId)) return;
  group.leaderId = targetId;
  group.lastKey = null;
  sendGroupState(groups, players, group.id, notify);
}
