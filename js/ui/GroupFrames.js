import { t } from '../i18n/I18n.js';

export function createGroupFrames({ onSelect, onLeave, onKick, onPromote, onAnswer }) {
  const container = document.getElementById('group-frames');
  const invite = document.getElementById('group-invite');
  const inviteText = document.getElementById('group-invite-text');
  let ownId = null;
  let group = null;
  let inviteTimer = null;
  let inviteKind = 'group';

  function percent(value, max) {
    return max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  }

  function render() {
    container.replaceChildren();
    if (!group || group.members.length < 2) {
      container.classList.add('hidden');
      return;
    }

    container.classList.remove('hidden');
    const ownIsLeader = group.leaderId === ownId;

    const header = document.createElement('div');
    header.className = 'group-header';
    const title = document.createElement('span');
    title.textContent = `${t('group.title')} ${group.members.length}/5`;
    const leave = document.createElement('button');
    leave.className = 'group-button';
    leave.textContent = t('group.leave');
    leave.addEventListener('click', onLeave);
    header.append(title, leave);
    container.appendChild(header);

    for (const member of group.members) {
      if (member.id === ownId) continue;

      const row = document.createElement('div');
      row.className = 'group-member';
      if (member.dead) row.classList.add('dead');
      row.dataset.playerId = member.id;

      const top = document.createElement('div');
      top.className = 'group-member-top';
      const name = document.createElement('span');
      name.className = 'group-member-name';
      name.textContent = `${member.id === group.leaderId ? '★ ' : ''}${member.name}`;
      const level = document.createElement('span');
      level.className = 'level-badge';
      level.textContent = member.level;
      top.append(name, level);

      const bar = document.createElement('div');
      bar.className = 'bar health-bar group-bar';
      const fill = document.createElement('div');
      fill.className = 'bar-fill';
      fill.style.width = `${percent(member.health, member.healthMax)}%`;
      bar.appendChild(fill);

      row.append(top, bar);

      if (ownIsLeader) {
        const actions = document.createElement('div');
        actions.className = 'group-actions';
        const promote = document.createElement('button');
        promote.className = 'group-button';
        promote.textContent = t('group.promote');
        promote.addEventListener('click', (event) => {
          event.stopPropagation();
          onPromote(member.id);
        });
        const kick = document.createElement('button');
        kick.className = 'group-button';
        kick.textContent = t('group.kick');
        kick.addEventListener('click', (event) => {
          event.stopPropagation();
          onKick(member.id);
        });
        actions.append(promote, kick);
        row.appendChild(actions);
      }

      row.addEventListener('click', () => onSelect(member.id));
      container.appendChild(row);
    }
  }

  function setGroup(message, id) {
    ownId = id;
    group = message.members?.length ? { leaderId: message.leaderId, members: message.members } : null;
    gameStateGroup = group;
    render();
  }

  let gameStateGroup = null;

  function getGroup() {
    return gameStateGroup;
  }

  function hideInvite() {
    invite.classList.add('hidden');
    clearTimeout(inviteTimer);
    inviteTimer = null;
  }

  function showInvite(text, kind = 'group') {
    inviteKind = kind;
    inviteText.textContent = text;
    invite.classList.remove('hidden');
    clearTimeout(inviteTimer);
    inviteTimer = setTimeout(hideInvite, 30000);
  }

  document.getElementById('group-invite-yes').addEventListener('click', () => {
    hideInvite();
    onAnswer(true, inviteKind);
  });

  document.getElementById('group-invite-no').addEventListener('click', () => {
    hideInvite();
    onAnswer(false, inviteKind);
  });

  function clear() {
    group = null;
    gameStateGroup = null;
    hideInvite();
    render();
  }

  return { setGroup, getGroup, showInvite, hideInvite, clear, render };
}
