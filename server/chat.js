export const CHAT_SAY_RANGE = 30;
const MAX_LENGTH = 200;
const RATE_LIMIT_COUNT = 5;
const RATE_LIMIT_WINDOW_MS = 10000;

const COMMANDS = {
  s: 'say',
  say: 'say',
  g: 'global',
  global: 'global',
};

function systemMessage(text) {
  return { type: 'chat', channel: 'system', text };
}

export function handleChat(players, senderId, message, notify, now = Date.now()) {
  const sender = players.get(senderId);
  if (!sender || typeof message.text !== 'string') return;

  let text = message.text.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  if (!text) return;

  let channel = 'say';
  const command = text.match(/^\/(\S+)\s*([\s\S]*)$/);

  if (command) {
    const mapped = COMMANDS[command[1].toLowerCase()];
    if (!mapped) {
      notify(senderId, systemMessage('Unbekannter Befehl.'));
      return;
    }

    channel = mapped;
    text = command[2].trim();
    if (!text) return;
  }

  sender.chatTimes = (sender.chatTimes ?? []).filter((time) => now - time < RATE_LIMIT_WINDOW_MS);
  if (sender.chatTimes.length >= RATE_LIMIT_COUNT) {
    notify(senderId, systemMessage('Du schreibst zu schnell.'));
    return;
  }
  sender.chatTimes.push(now);

  const payload = { type: 'chat', channel, from: sender.characterName, fromId: senderId, text: text.slice(0, MAX_LENGTH) };

  for (const [id, player] of players) {
    const inRange = player.zoneId === sender.zoneId && Math.hypot(player.x - sender.x, player.z - sender.z) <= CHAT_SAY_RANGE;
    if (channel === 'global' || inRange) notify(id, payload);
  }
}
