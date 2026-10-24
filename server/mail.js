import { addGold } from './loot.js';
import { getZone } from './zoneLoader.js';

export const MAIL_COST = 10;
export const MAIL_RANGE = 4;
export const MAX_SUBJECT = 60;
export const MAX_BODY = 500;
export const MAX_INBOX = 50;
const SEND_COOLDOWN_MS = 2000;

function clean(value, max, multiline) {
  if (typeof value !== 'string') return '';
  const pattern = multiline ? /[\u0000-\u0009\u000b-\u001f\u007f]/g : /[\u0000-\u001f\u007f]/g;
  return value.replace(pattern, ' ').trim().slice(0, max);
}

function fail(notify, playerId, reason) {
  notify(playerId, { type: 'event', kind: 'mail-failed', reason });
}

export async function deliverMail(db, { recipientId, senderId = null, senderName, subject, body }) {
  const [count] = await db.query('SELECT COUNT(*) AS total FROM mails WHERE recipient_id = ?', [recipientId]);
  if (Number(count[0]?.total ?? 0) >= MAX_INBOX) return null;

  const [result] = await db.query(
    'INSERT INTO mails (recipient_id, sender_id, sender_name, subject, body) VALUES (?, ?, ?, ?, ?)',
    [recipientId, senderId, senderName, subject, body]
  );
  return result.insertId;
}

export async function unreadCount(db, characterId) {
  const [rows] = await db.query('SELECT COUNT(*) AS total FROM mails WHERE recipient_id = ? AND is_read = 0', [characterId]);
  return Number(rows[0]?.total ?? 0);
}

async function listMails(db, characterId) {
  const [rows] = await db.query(
    'SELECT id, sender_name, subject, body, is_read, UNIX_TIMESTAMP(created_at) * 1000 AS sent_at FROM mails WHERE recipient_id = ? ORDER BY id DESC LIMIT ?',
    [characterId, MAX_INBOX]
  );
  return rows.map((row) => ({
    id: Number(row.id),
    from: row.sender_name,
    subject: row.subject,
    body: row.body,
    read: Boolean(row.is_read),
    sentAt: Number(row.sent_at),
  }));
}

export async function sendStatus(ctx, playerId, state) {
  const unread = await unreadCount(ctx.db, state.characterId);
  ctx.notify(playerId, { type: 'mail-status', unread });
}

export async function notifyRecipient(ctx, recipientId) {
  for (const [playerId, state] of ctx.players) {
    if (state.characterId !== recipientId) continue;
    await sendStatus(ctx, playerId, state);
    ctx.notify(playerId, { type: 'event', kind: 'mail-received' });
  }
}

function nearMailbox(state, mailboxId) {
  const zone = getZone(state.zoneId);
  const box = zone?.mailboxes?.find((candidate) => candidate.id === mailboxId);
  return Boolean(box) && Math.hypot(state.x - box.x, state.z - box.z) <= MAIL_RANGE;
}

async function sendWindow(ctx, playerId, state) {
  const mails = await listMails(ctx.db, state.characterId);
  ctx.notify(playerId, { type: 'mail-window', mails, cost: MAIL_COST, limits: { subject: MAX_SUBJECT, body: MAX_BODY } });
  await sendStatus(ctx, playerId, state);
}

export async function handleMail(ctx, playerId, state, message, now = Date.now()) {
  if (!state || state.dead || typeof message.type !== 'string') return;
  if (typeof message.mailboxId !== 'string' || !nearMailbox(state, message.mailboxId)) return fail(ctx.notify, playerId, 'too-far');

  switch (message.type) {
    case 'mail-open':
      return sendWindow(ctx, playerId, state);

    case 'mail-read': {
      const mailId = Number.parseInt(message.mailId, 10);
      if (!Number.isInteger(mailId)) return;
      await ctx.db.query('UPDATE mails SET is_read = 1 WHERE id = ? AND recipient_id = ?', [mailId, state.characterId]);
      return sendStatus(ctx, playerId, state);
    }

    case 'mail-delete': {
      const mailId = Number.parseInt(message.mailId, 10);
      if (!Number.isInteger(mailId)) return;
      await ctx.db.query('DELETE FROM mails WHERE id = ? AND recipient_id = ?', [mailId, state.characterId]);
      return sendWindow(ctx, playerId, state);
    }

    case 'mail-send': {
      const to = clean(message.to, 32, false);
      const subject = clean(message.subject, MAX_SUBJECT, false);
      const body = clean(message.body, MAX_BODY, true);
      if (!to || !subject || !body) return fail(ctx.notify, playerId, 'invalid');
      if (state.mailBusy || now - (state.lastMailAt ?? 0) < SEND_COOLDOWN_MS) return fail(ctx.notify, playerId, 'rate-limit');
      if (state.gold < MAIL_COST) return fail(ctx.notify, playerId, 'no-gold');

      state.mailBusy = true;
      try {
        const [rows] = await ctx.db.query('SELECT id, name FROM characters WHERE name = ?', [to]);
        const recipient = rows[0];
        if (!recipient) return fail(ctx.notify, playerId, 'unknown-recipient');
        if (Number(recipient.id) === state.characterId) return fail(ctx.notify, playerId, 'self');
        if (state.gold < MAIL_COST) return fail(ctx.notify, playerId, 'no-gold');

        const mailId = await deliverMail(ctx.db, {
          recipientId: Number(recipient.id),
          senderId: state.characterId,
          senderName: state.characterName,
          subject,
          body,
        });
        if (mailId === null) return fail(ctx.notify, playerId, 'recipient-full');

        addGold(state, -MAIL_COST);
        state.dataVersion += 1;
        state.lastMailAt = now;
        ctx.notify(playerId, { type: 'event', kind: 'mail-sent', to: recipient.name, cost: MAIL_COST });
        await notifyRecipient(ctx, Number(recipient.id));
      } finally {
        state.mailBusy = false;
      }
    }
  }
}
