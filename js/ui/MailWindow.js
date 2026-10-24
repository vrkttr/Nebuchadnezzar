import { t, tOr } from '../i18n/I18n.js';

export function createMailWindow(state, handlers = {}) {
  const windowEl = document.getElementById('mail-window');
  const tabs = document.getElementById('mail-tabs');
  const body = document.getElementById('mail-body');
  const closeButton = document.getElementById('mail-close');
  const indicator = document.getElementById('mail-indicator');

  let mailboxId = null;
  let data = { mails: [], cost: 0, limits: { subject: 60, body: 500 } };
  let tab = 'inbox';
  let selectedId = null;
  let pending = false;
  let pendingTimer = null;
  const draft = { to: '', subject: '', body: '' };

  function isOpen() {
    return !windowEl.classList.contains('hidden');
  }

  function hide() {
    windowEl.classList.add('hidden');
    mailboxId = null;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function actionButton(label, onClick, className = 'window-button mail-button') {
    const node = el('button', className, label);
    node.type = 'button';
    node.addEventListener('click', onClick);
    return node;
  }

  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  }

  function send(payload) {
    handlers.onSend?.({ ...payload, mailboxId });
  }

  function select(mail) {
    selectedId = mail.id;
    if (!mail.read) {
      mail.read = true;
      send({ type: 'mail-read', mailId: mail.id });
    }
    render();
  }

  function renderInbox() {
    const wrapper = el('div', 'mail-inbox');
    const list = el('div', 'mail-list');

    if (data.mails.length === 0) list.appendChild(el('div', 'mail-empty', t('mail.empty')));

    for (const mail of data.mails) {
      const row = el('div', `mail-row${mail.read ? '' : ' unread'}${mail.id === selectedId ? ' selected' : ''}`);
      row.appendChild(el('span', 'mail-subject', mail.subject));
      row.appendChild(el('span', 'mail-from', `${mail.from} · ${formatDate(mail.sentAt)}`));
      row.addEventListener('click', () => select(mail));
      list.appendChild(row);
    }
    wrapper.appendChild(list);

    const mail = data.mails.find((candidate) => candidate.id === selectedId);
    if (mail) {
      const view = el('div', 'mail-view');
      view.appendChild(el('div', 'mail-view-subject', mail.subject));
      view.appendChild(el('div', 'mail-view-meta', t('mail.from', { name: mail.from, date: formatDate(mail.sentAt) })));
      view.appendChild(el('div', 'mail-view-body', mail.body));
      const actions = el('div', 'mail-actions');
      if (mail.senderReplyable !== false && mail.from) {
        actions.appendChild(
          actionButton(t('mail.reply'), () => {
            draft.to = mail.from;
            draft.subject = mail.subject.startsWith('AW: ') ? mail.subject : `AW: ${mail.subject}`.slice(0, data.limits.subject);
            draft.body = '';
            tab = 'compose';
            render();
          })
        );
      }
      actions.appendChild(
        actionButton(t('mail.delete'), () => {
          selectedId = null;
          send({ type: 'mail-delete', mailId: mail.id });
        }, 'window-button window-button-danger mail-button')
      );
      view.appendChild(actions);
      wrapper.appendChild(view);
    }
    return wrapper;
  }

  function renderCompose() {
    const form = el('div', 'mail-compose');

    const to = el('input', 'mail-input');
    to.placeholder = t('mail.to');
    to.maxLength = 32;
    to.value = draft.to;
    to.addEventListener('input', () => (draft.to = to.value));

    const subject = el('input', 'mail-input');
    subject.placeholder = t('mail.subject');
    subject.maxLength = data.limits.subject;
    subject.value = draft.subject;
    subject.addEventListener('input', () => (draft.subject = subject.value));

    const text = el('textarea', 'mail-input mail-textarea');
    text.placeholder = t('mail.text');
    text.maxLength = data.limits.body;
    text.value = draft.body;
    const counter = el('div', 'mail-counter', `${draft.body.length}/${data.limits.body}`);
    text.addEventListener('input', () => {
      draft.body = text.value;
      counter.textContent = `${draft.body.length}/${data.limits.body}`;
    });

    const footer = el('div', 'mail-actions');
    footer.appendChild(el('span', 'mail-cost', t('mail.cost', { gold: data.cost })));
    const sendButton = actionButton(t('mail.send'), () => {
      if (pending) return;
      pending = true;
      sendButton.disabled = true;
      clearTimeout(pendingTimer);
      pendingTimer = setTimeout(() => {
        pending = false;
        sendButton.disabled = false;
      }, 5000);
      send({ type: 'mail-send', to: draft.to, subject: draft.subject, body: draft.body });
    });
    sendButton.disabled = pending;
    footer.appendChild(sendButton);

    form.append(to, subject, text, counter, footer);
    return form;
  }

  function render() {
    for (const button of tabs.querySelectorAll('button')) button.classList.toggle('active', button.dataset.tab === tab);
    body.replaceChildren(tab === 'inbox' ? renderInbox() : renderCompose());
  }

  function show(message, boxId) {
    mailboxId = boxId ?? mailboxId;
    data = { mails: message.mails ?? [], cost: message.cost ?? 0, limits: message.limits ?? data.limits };
    if (!data.mails.some((mail) => mail.id === selectedId)) selectedId = null;
    windowEl.classList.remove('hidden');
    render();
  }

  function failed() {
    pending = false;
    clearTimeout(pendingTimer);
    if (isOpen() && tab === 'compose') render();
  }

  function sent() {
    pending = false;
    clearTimeout(pendingTimer);
    draft.to = '';
    draft.subject = '';
    draft.body = '';
    tab = 'inbox';
    if (isOpen()) render();
  }

  function setUnread(count) {
    indicator.classList.toggle('hidden', !count);
    indicator.title = count ? tOr(['mail.indicator'], 'Post') : '';
  }

  function setMailbox(id) {
    mailboxId = id;
  }

  tabs.addEventListener('click', (event) => {
    const target = event.target.closest('button[data-tab]');
    if (!target) return;
    tab = target.dataset.tab;
    render();
  });
  closeButton.addEventListener('click', hide);

  return { isOpen, hide, show, sent, failed, setUnread, setMailbox, currentMailboxId: () => mailboxId };
}
