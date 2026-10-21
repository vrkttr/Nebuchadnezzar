import { releaseAllKeys } from '../input/Keyboard.js';
import { has, t } from '../i18n/I18n.js';

const MAX_CHAT_LINES = 50;

export function createChat({ onSend }) {
  const input = document.getElementById('chat-input');
  const messages = document.getElementById('chat-messages');

  function add({ channel, from, text, key, params }) {
    const line = document.createElement('div');
    line.className = `chat-line chat-line-${channel}`;

    if (channel === 'system') {
      line.textContent = key && has(key) ? t(key, params) : text;
    } else {
      const name = document.createElement('span');
      name.className = 'chat-name';
      name.textContent = `${channel === 'global' ? t('chat.global') : channel === 'party' ? t('chat.party') : channel === 'guild' ? t('chat.guild') : ''}${from}: `;
      line.appendChild(name);
      line.appendChild(document.createTextNode(text));
    }

    messages.appendChild(line);

    while (messages.childElementCount > MAX_CHAT_LINES) {
      messages.removeChild(messages.firstChild);
    }

    messages.scrollTop = messages.scrollHeight;
  }

  function close() {
    input.value = '';
    input.blur();
  }

  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Enter' && event.code !== 'NumpadEnter') return;
    if (document.activeElement === input) return;

    event.preventDefault();
    releaseAllKeys();
    input.focus();
  });

  input.addEventListener('keydown', (event) => {
    event.stopPropagation();

    if (event.code === 'Escape') {
      close();
    } else if (event.code === 'Enter' || event.code === 'NumpadEnter') {
      const text = input.value.trim();
      if (text) onSend(text);
      close();
    }
  });

  input.addEventListener('keyup', (event) => event.stopPropagation());

  return { add };
}
