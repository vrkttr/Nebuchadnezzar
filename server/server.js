import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';

const PORT = process.env.PORT || 8081;
const wss = new WebSocketServer({ port: PORT });

console.log(`Nebuchadnezzar Game-Server läuft auf Port ${PORT}`);

const MOVE_SPEED = 4;
const JUMP_SPEED = 5.5;
const GRAVITY = 14;
const GROUND_Y = 0;
const TICK_INTERVAL_MS = 50;
const TICK_DELTA = TICK_INTERVAL_MS / 1000;

const players = new Map();

function createInitialState() {
  return {
    x: 0,
    y: 0,
    z: 0,
    rotationY: 0,
    velocityY: 0,
    isGrounded: true,
    input: { moveX: 0, moveZ: 0, jump: false },
  };
}

wss.on('connection', (socket) => {
  const id = randomUUID();
  players.set(id, createInitialState());

  console.log(`Neuer Client verbunden (${id})`);
  socket.send(JSON.stringify({ type: 'init', id }));

  socket.on('message', (data) => {
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (message.type === 'input') {
      const state = players.get(id);
      if (!state) return;

      let moveX = Number(message.moveX) || 0;
      let moveZ = Number(message.moveZ) || 0;
      const length = Math.hypot(moveX, moveZ);
      if (length > 1) {
        moveX /= length;
        moveZ /= length;
      }

      state.input.moveX = moveX;
      state.input.moveZ = moveZ;
      state.input.jump = Boolean(message.jump);
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

function simulate() {
  for (const state of players.values()) {
    const { input } = state;

    state.x += input.moveX * MOVE_SPEED * TICK_DELTA;
    state.z += input.moveZ * MOVE_SPEED * TICK_DELTA;

    if (input.moveX !== 0 || input.moveZ !== 0) {
      state.rotationY = Math.atan2(input.moveX, input.moveZ);
    }

    if (input.jump && state.isGrounded) {
      state.velocityY = JUMP_SPEED;
      state.isGrounded = false;
    }

    state.velocityY -= GRAVITY * TICK_DELTA;
    state.y += state.velocityY * TICK_DELTA;

    if (state.y <= GROUND_Y) {
      state.y = GROUND_Y;
      state.velocityY = 0;
      state.isGrounded = true;
    }
  }
}

setInterval(() => {
  simulate();
  if (players.size === 0) return;

  const snapshot = {};
  for (const [id, state] of players) {
    snapshot[id] = { x: state.x, y: state.y, z: state.z, rotationY: state.rotationY };
  }
  broadcast({ type: 'state', players: snapshot });
}, TICK_INTERVAL_MS);
