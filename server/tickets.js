import { deliverMail, notifyRecipient, MAX_BODY, MAX_SUBJECT } from './mail.js';
import { adminNames } from './admin.js';

const COOLDOWN_MS = 30000;
const TICKET_PREFIX = '[Ticket] ';

function clean(value, max, multiline) {
  if (typeof value !== 'string') return '';
  const pattern = multiline ? /[\u0000-\u0009\u000b-\u001f\u007f]/g : /[\u0000-\u001f\u007f]/g;
  return value.replace(pattern, ' ').trim().slice(0, max);
}

function fail(notify, playerId, reason) {
  notify(playerId, { type: 'event', kind: 'ticket-failed', reason });
}

export async function handleTicket(ctx, playerId, state, message, now = Date.now()) {
  if (!state || message.type !== 'ticket-send') return;

  const subject = clean(message.subject, MAX_SUBJECT - TICKET_PREFIX.length, false);
  const text = clean(message.body, MAX_BODY, true);
  if (!subject || !text) return fail(ctx.notify, playerId, 'invalid');
  if (state.ticketBusy || now - (state.lastTicketAt ?? 0) < COOLDOWN_MS) return fail(ctx.notify, playerId, 'rate-limit');

  state.ticketBusy = true;
  try {
    const names = adminNames();
    if (names.length === 0) return fail(ctx.notify, playerId, 'unavailable');

    const [rows] = await ctx.db.query(`SELECT id, name FROM characters WHERE name IN (${names.map(() => '?').join(',')})`, names);
    if (rows.length === 0) return fail(ctx.notify, playerId, 'unavailable');

    const body = `${text}\n\n— ${state.characterName} (Level ${state.level}, ${state.zoneId}, ${Math.round(state.x)} / ${Math.round(state.z)})`.slice(0, MAX_BODY + 200);
    let delivered = 0;
    for (const row of rows) {
      const mailId = await deliverMail(ctx.db, {
        recipientId: Number(row.id),
        senderId: state.characterId,
        senderName: state.characterName,
        subject: `${TICKET_PREFIX}${subject}`,
        body,
      });
      if (mailId !== null) {
        delivered += 1;
        await notifyRecipient(ctx, Number(row.id));
      }
    }

    if (delivered === 0) return fail(ctx.notify, playerId, 'unavailable');

    state.lastTicketAt = now;
    ctx.notify(playerId, { type: 'event', kind: 'ticket-sent' });
  } finally {
    state.ticketBusy = false;
  }
}
