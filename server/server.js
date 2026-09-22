import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';

const PORT = process.env.PORT || 8081;
const wss = new WebSocketServer({ port: PORT });

console.log(`Nebuchadnezzar Game-Server läuft auf Port ${PORT}`);

// Aktuell bekannte Spieler: id -> { x, y, z, rotationY }.
// Der Server übernimmt vorerst die vom Client gemeldete Position ungeprüft
// (noch keine Bewegungsvalidierung) — das folgt als späterer Ausbauschritt.
const players = new Map();

const BROADCAST_INTERVAL_MS = 50;

wss.on('connection', (socket) => {
  const id = randomUUID();
  players.set(id, { x: 0, y: 0, z: 0, rotationY: 0 });

  console.log(`Neuer Client verbunden (${id})`);

  socket.send(JSON.stringify({ type: 'init', id }));

  socket.on('message', (data) => {
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (message.type === 'position') {
      const state = players.get(id);
      if (!state) return;
      state.x = message.x;
      state.y = message.y;
      state.z = message.z;
      state.rotationY = message.rotationY;
    }
  });

  socket.on('close', () => {
    players.delete(id);
    broadcast({ type: 'leave', id });
    console.log(`Client getrennt (${id})`);
  });

  socket.on('error', (error) => {
    console.error('Socket-Fehler:', error);
  });
});

function broadcast(message) {
  const data = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(data);
    }
  }
}

setInterval(() => {
  if (players.size === 0) return;
  broadcast({ type: 'state', players: Object.fromEntries(players) });
}, BROADCAST_INTERVAL_MS);
