import { releaseAllKeys } from '../input/Keyboard.js';

const MAX_CHAT_LINES = 50;
const CHANNEL_PREFIX = { global: '[Global] ' };

export function createChat({ onSend }) {
  const input = document.getElementById('chat-input');
  const messages = document.getElementById('chat-messages');

  function add({ channel, from, text }) {
    const line = document.createElement('div');
    line.className = `chat-line chat-line-${channel}`;

    if (channel === 'system') {
      line.textContent = text;
    } else {
      const name = document.createElement('span');
      name.className = 'chat-name';
      name.textContent = `${CHANNEL_PREFIX[channel] ?? ''}${from}: `;
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
