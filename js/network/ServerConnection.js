/**
 * Baut die WebSocket-Verbindung zum Game-Server auf.
 * Aktuell nur Verbindungsaufbau und Logging — Nachrichtenformat und
 * Positions-Synchronisation folgen als nächster Entwicklungsschritt.
 */
export function createServerConnection(url) {
  const socket = new WebSocket(url);

  socket.addEventListener('open', () => {
    console.log('[ServerConnection] Verbindung zum Server hergestellt');
  });

  socket.addEventListener('message', (event) => {
    console.log('[ServerConnection] Nachricht vom Server:', event.data);
  });

  socket.addEventListener('close', () => {
    console.log('[ServerConnection] Verbindung zum Server getrennt');
  });

  socket.addEventListener('error', (error) => {
    console.error('[ServerConnection] Verbindungsfehler:', error);
  });

  return socket;
}
