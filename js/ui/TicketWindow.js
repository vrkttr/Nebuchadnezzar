import { t } from '../i18n/I18n.js';

const SUBJECT_MAX = 50;
const BODY_MAX = 500;

export function createTicketWindow(handlers = {}) {
  const windowEl = document.getElementById('ticket-window');
  const body = document.getElementById('ticket-body');
  const closeButton = document.getElementById('ticket-close');
  const openButton = document.getElementById('ticket-button');

  const draft = { subject: '', body: '' };
  let pending = false;
  let pendingTimer = null;

  function isOpen() {
    return !windowEl.classList.contains('hidden');
  }

  function hide() {
    windowEl.classList.add('hidden');
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function render() {
    const form = el('div', 'mail-compose');
    form.appendChild(el('div', 'mail-view-meta', t('ticket.hint')));

    const subject = el('input', 'mail-input');
    subject.placeholder = t('ticket.subject');
    subject.maxLength = SUBJECT_MAX;
    subject.value = draft.subject;
    subject.addEventListener('input', () => (draft.subject = subject.value));

    const text = el('textarea', 'mail-input mail-textarea');
    text.placeholder = t('ticket.text');
    text.maxLength = BODY_MAX;
    text.value = draft.body;
    const counter = el('div', 'mail-counter', `${draft.body.length}/${BODY_MAX}`);
    text.addEventListener('input', () => {
      draft.body = text.value;
      counter.textContent = `${draft.body.length}/${BODY_MAX}`;
    });

    const footer = el('div', 'mail-actions');
    const sendButton = el('button', 'window-button mail-button', t('ticket.send'));
    sendButton.type = 'button';
    sendButton.disabled = pending;
    sendButton.addEventListener('click', () => {
      if (pending || !draft.subject.trim() || !draft.body.trim()) return;
      pending = true;
      sendButton.disabled = true;
      clearTimeout(pendingTimer);
      pendingTimer = setTimeout(() => {
        pending = false;
        if (isOpen()) render();
      }, 5000);
      handlers.onSend?.({ type: 'ticket-send', subject: draft.subject, body: draft.body });
    });
    footer.appendChild(sendButton);

    form.append(subject, text, counter, footer);
    body.replaceChildren(form);
  }

  function show() {
    windowEl.classList.remove('hidden');
    render();
  }

  function toggle() {
    if (isOpen()) hide();
    else show();
  }

  function sent() {
    pending = false;
    clearTimeout(pendingTimer);
    draft.subject = '';
    draft.body = '';
    hide();
  }

  function failed() {
    pending = false;
    clearTimeout(pendingTimer);
    if (isOpen()) render();
  }

  openButton.addEventListener('click', toggle);
  closeButton.addEventListener('click', hide);

  return { isOpen, hide, toggle, sent, failed };
}
