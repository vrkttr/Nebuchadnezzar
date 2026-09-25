import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';

const PORT = process.env.PORT || 8081;
const wss = new WebSocketServer({ port: PORT });

const dbPool = mysql.createPool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

console.log(`Nebuchadnezzar Game-Server läuft auf Port ${PORT}`);

const MOVE_SPEED = 4;
const JUMP_SPEED = 5.5;
const GRAVITY = 14;
const GROUND_Y = 0;
const TICK_INTERVAL_MS = 50;
const TICK_DELTA = TICK_INTERVAL_MS / 1000;
const SAVE_INTERVAL_MS = 2000;

const players = new Map();

function createInitialState(character) {
  return {
    characterId: character.id,
    characterName: character.name,
    x: character.x,
    y: character.y,
    z: character.z,
    rotationY: character.rotationY,
    velocityY: 0,
    isGrounded: true,
    input: { moveX: 0, moveZ: 0, jump: false },
  };
}

async function resolveCharacterFromToken(token) {
  if (!token) return null;

  const [tokenRows] = await dbPool.query(
    'SELECT character_id FROM login_tokens WHERE token = ? AND expires_at > NOW()',
    [token]
  );

  if (tokenRows.length === 0) return null;

  await dbPool.query('DELETE FROM login_tokens WHERE token = ?', [token]);

  const characterId = tokenRows[0].character_id;

  const [characterRows] = await dbPool.query(
    'SELECT id, name, pos_x, pos_y, pos_z, rotation_y FROM characters WHERE id = ?',
    [characterId]
  );

  if (characterRows.length === 0) return null;

  const row = characterRows[0];

  return {
    id: row.id,
    name: row.name,
    x: row.pos_x,
    y: row.pos_y,
    z: row.pos_z,
    rotationY: row.rotation_y,
  };
}

async function persistState(state) {
  await dbPool.query(
    'UPDATE characters SET pos_x = ?, pos_y = ?, pos_z = ?, rotation_y = ? WHERE id = ?',
    [state.x, state.y, state.z, state.rotationY, state.characterId]
  );
}

wss.on('connection', async (socket, request) => {
  const url = new URL(request.url, 'http://localhost');
  const token = url.searchParams.get('token');

  const character = await resolveCharacterFromToken(token);

  if (!character) {
    socket.close(4001, 'invalid-token');
    return;
  }

  const id = randomUUID();
  players.set(id, createInitialState(character));

  console.log(`Neuer Client verbunden (${id}, Charakter: ${character.name})`);
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
    const state = players.get(id);
    if (state) {
      persistState(state).catch((error) => console.error('Fehler beim Speichern der Position:', error));
    }
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
    snapshot[id] = {
      x: state.x,
      y: state.y,
      z: state.z,
      rotationY: state.rotationY,
      characterName: state.characterName,
    };
  }
  broadcast({ type: 'state', players: snapshot });
}, TICK_INTERVAL_MS);

setInterval(() => {
  for (const state of players.values()) {
    persistState(state).catch((error) => console.error('Fehler beim Speichern der Position:', error));
  }
}, SAVE_INTERVAL_MS);
