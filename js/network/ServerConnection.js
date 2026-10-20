export function createServerConnection(url, handlers = {}) {
  const socket = new WebSocket(url);

  socket.addEventListener('open', () => {
    console.log('[ServerConnection] Verbindung zum Server hergestellt');
    handlers.onOpen?.();
  });

  socket.addEventListener('message', (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      console.warn('[ServerConnection] Ungültige Nachricht ignoriert:', event.data);
      return;
    }
    handlers.onMessage?.(message);
  });

  socket.addEventListener('close', (event) => {
    console.log('[ServerConnection] Verbindung zum Server getrennt');
    handlers.onClose?.(event);
  });

  socket.addEventListener('error', (error) => {
    console.error('[ServerConnection] Verbindungsfehler:', error);
    handlers.onError?.(error);
  });

  window.addEventListener('pagehide', () => socket.close());

  return {
    send(message) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    },
  };
}
