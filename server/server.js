import { handleChat } from './chat.js';
import { loadAppearance } from './appearance.js';
import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { createEnemies, serializeEnemies, serializeEnemyStates, updateEnemies } from './enemies.js';
import { createCombatState, updateCombat, useAbility } from './combat.js';
import { serializeAbilities } from './abilities.js';
import { xpToNextLevel } from './progression.js';
import { serializeItems } from './items.js';
import { inventoryRows, loadInventory, serializeInventory } from './inventory.js';
import { grantStarterKit } from './starterKit.js';
import { equipmentRows, loadEquipment, serializeEquipment } from './equipment.js';
import { destroyInventoryItem, moveInventoryItem, unequipItem, useInventoryItem } from './itemActions.js';
import { serializeNpcs } from './npcs.js';
import {
  acceptNpcQuest,
  buyFromVendor,
  completeNpcQuest,
  openNpc,
  openVendor,
  sellToVendor,
} from './npcInteraction.js';
import { diffQuestLog, loadQuests, questRows, recordKill, serializeQuestLog } from './quests.js';
import { PLAYER_RADIUS, resolveCollisions } from './world.js';
import { DEFAULT_ZONE_ID, getZone, getZones, serializeZone } from './zoneLoader.js';
import {
  createLootContainers,
  openLoot,
  removeLootOfPlayer,
  spawnLootForKill,
  takeAllLoot,
  takeLootEntry,
  updateLootContainers,
} from './lootContainers.js';

const PORT = process.env.PORT || 8081;
const wss = new WebSocketServer({ port: PORT });

const dbPool = mysql.createPool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

console.log(`Nebuchadnezzar Game-Server läuft auf Port ${PORT}`);

const WALK_SPEED = 2;
const RUN_SPEED = 4;
const JUMP_SPEED = 5.5;
const GRAVITY = 14;
const GROUND_Y = 0;
const TICK_INTERVAL_MS = 50;
const TICK_DELTA = TICK_INTERVAL_MS / 1000;
const SAVE_INTERVAL_MS = 2000;

const players = new Map();
const sockets = new Map();
const zoneEnemies = new Map(getZones().map((zone) => [zone.id, createEnemies(zone.id)]));
const TELEPORT_RANGE = 4.5;
const ZONE_LOAD_TIMEOUT_MS = 15000;
const lootContainers = createLootContainers();

function notify(playerId, message) {
  const socket = sockets.get(playerId);
  if (socket && socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function onKill(playerId, player, enemy) {
  recordKill(player, enemy);
  spawnLootForKill(lootContainers, playerId, player, enemy, notify);
}

function createInitialState(character) {
  const state = {
    characterId: character.id,
    characterName: character.name,
    zoneId: character.zoneId,
    loadingUntil: 0,
    appearance: character.appearance,
    x: character.x,
    y: character.y,
    z: character.z,
    rotationY: character.rotationY,
    velocityY: 0,
    isGrounded: true,
    input: { moveX: 0, moveZ: 0, jump: false, run: false },
    inventory: character.inventory,
    consumableReadyAt: 0,
    dataVersion: character.starterKit ? 1 : 0,
    savedDataVersion: 0,
    saveQueue: Promise.resolve(),
    quests: character.quests,
    questView: null,
    questViewKey: '',
    ...createCombatState(character),
  };

  resolveCollisions(state, PLAYER_RADIUS);

  return state;
}

async function consumeLoginToken(token) {
  if (!token) return null;

  const [tokenRows] = await dbPool.query(
    'SELECT character_id FROM login_tokens WHERE token = ? AND expires_at > NOW()',
    [token]
  );

  if (tokenRows.length === 0) return null;

  await dbPool.query('DELETE FROM login_tokens WHERE token = ?', [token]);

  return tokenRows[0].character_id;
}

async function loadCharacter(characterId) {
  const [characterRows] = await dbPool.query(
    'SELECT c.id, c.name, c.pos_x, c.pos_y, c.pos_z, c.rotation_y, c.level, c.xp, c.gold, c.appear_skin, c.appear_hair_style, c.appear_hair_color, c.appear_top, c.appear_pants, c.starter_kit, c.zone, u.audio_volume, u.audio_ambient, u.audio_muted FROM characters c JOIN users u ON u.id = c.user_id WHERE c.id = ?',
    [characterId]
  );

  if (characterRows.length === 0) return null;

  const row = characterRows[0];

  const [savedItemRows] = await dbPool.query(
    'SELECT slot, item_id, quantity FROM inventory_items WHERE character_id = ?',
    [characterId]
  );

  const [savedEquipmentRows] = await dbPool.query(
    'SELECT slot, item_id FROM equipment_items WHERE character_id = ?',
    [characterId]
  );

  const [savedQuestRows] = await dbPool.query(
    'SELECT quest_id, status, progress FROM character_quests WHERE character_id = ?',
    [characterId]
  );

  const inventory = loadInventory(savedItemRows);
  const equipment = loadEquipment(savedEquipmentRows);
  const zoneId = getZone(row.zone) ? row.zone : DEFAULT_ZONE_ID;
  const startPosition = zoneId === row.zone ? { x: row.pos_x, y: row.pos_y, z: row.pos_z } : getZone(zoneId).spawn;
  const starterKit = !row.starter_kit;
  if (starterKit) grantStarterKit(inventory, equipment);

  return {
    id: row.id,
    name: row.name,
    starterKit,
    zoneId,
    x: startPosition.x,
    y: startPosition.y,
    z: startPosition.z,
    rotationY: row.rotation_y,
    level: row.level,
    xp: row.xp,
    gold: row.gold,
    appearance: loadAppearance(row),
    audio: { volume: row.audio_volume / 100, ambient: row.audio_ambient / 100, muted: Boolean(row.audio_muted) },
    inventory,
    equipment,
    quests: loadQuests(savedQuestRows),
  };
}

async function disconnectCharacter(characterId) {
  for (const [playerId, state] of players) {
    if (state.characterId !== characterId) continue;

    const socket = sockets.get(playerId);
    removePlayer(playerId);
    if (socket) socket.close(4002, 'replaced');
    await state.saveQueue.catch(() => {});
    await persistState(state).catch((error) => console.error('Fehler beim Speichern der Position:', error));
  }
}

function removePlayer(playerId) {
  const state = players.get(playerId);
  if (!state) return null;

  removeLootOfPlayer(lootContainers, playerId);
  players.delete(playerId);
  sockets.delete(playerId);
  sendToZone(state.zoneId, { type: 'leave', id: playerId });
  return state;
}

async function writeState(state) {
  const dataVersion = state.dataVersion;
  const items = inventoryRows(state.inventory);
  const equipped = equipmentRows(state.equipment);
  const quests = questRows(state.quests);

  const characterQuery =
    'UPDATE characters SET pos_x = ?, pos_y = ?, pos_z = ?, rotation_y = ?, level = ?, xp = ?, gold = ?, starter_kit = 1, zone = ? WHERE id = ?';
  const characterParams = [
    state.x,
    state.y,
    state.z,
    state.rotationY,
    state.level,
    Math.floor(state.xp),
    state.gold,
    state.zoneId,
    state.characterId,
  ];

  if (dataVersion === state.savedDataVersion) {
    await dbPool.query(characterQuery, characterParams);
    return;
  }

  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query(characterQuery, characterParams);

    await connection.query('DELETE FROM inventory_items WHERE character_id = ?', [state.characterId]);

    if (items.length > 0) {
      await connection.query(
        'INSERT INTO inventory_items (character_id, slot, item_id, quantity) VALUES ?',
        [items.map(([slot, itemId, quantity]) => [state.characterId, slot, itemId, quantity])]
      );
    }

    await connection.query('DELETE FROM equipment_items WHERE character_id = ?', [state.characterId]);

    if (equipped.length > 0) {
      await connection.query('INSERT INTO equipment_items (character_id, slot, item_id) VALUES ?', [
        equipped.map(([slot, itemId]) => [state.characterId, slot, itemId]),
      ]);
    }

    await connection.query('DELETE FROM character_quests WHERE character_id = ?', [state.characterId]);

    if (quests.length > 0) {
      await connection.query(
        'INSERT INTO character_quests (character_id, quest_id, status, progress) VALUES ?',
        [quests.map(([questId, status, progress]) => [state.characterId, questId, status, progress])]
      );
    }

    await connection.commit();
    state.savedDataVersion = dataVersion;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function persistState(state) {
  const run = state.saveQueue.then(() => writeState(state));
  state.saveQueue = run.catch(() => {});
  return run;
}

wss.on('connection', async (socket, request) => {
  const url = new URL(request.url, 'http://localhost');
  const token = url.searchParams.get('token');

  const characterId = await consumeLoginToken(token);

  if (characterId === null) {
    socket.close(4001, 'invalid-token');
    return;
  }

  await disconnectCharacter(characterId);

  const character = await loadCharacter(characterId);

  if (!character) {
    socket.close(4001, 'invalid-token');
    return;
  }

  socket.isAlive = true;
  socket.on('pong', () => {
    socket.isAlive = true;
  });

  const id = randomUUID();
  const initialState = createInitialState(character);
  initialState.loadingUntil = Date.now() + ZONE_LOAD_TIMEOUT_MS;
  players.set(id, initialState);
  sockets.set(id, socket);

  console.log(`Neuer Client verbunden (${id}, Charakter: ${character.name})`);
  socket.send(
    JSON.stringify({
      type: 'init',
      id,
      enemies: serializeEnemies(zoneEnemies.get(initialState.zoneId)),
      abilities: serializeAbilities(initialState.actionBar),
      items: serializeItems(),
      inventory: serializeInventory(initialState.inventory),
      equipment: serializeEquipment(initialState.equipment),
      appearance: initialState.appearance,
      npcs: serializeNpcs(initialState.zoneId),
      world: serializeZone(getZone(initialState.zoneId)),
      position: { x: initialState.x, y: initialState.y, z: initialState.z, rotationY: initialState.rotationY },
      audio: character.audio,
    })
  );

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
      state.input.run = Boolean(message.run);
    } else if (message.type === 'chat') {
      handleChat(players, id, message, notify);
    } else if (message.type === 'target') {
      const state = players.get(id);
      if (!state || state.dead) return;

      const enemy = typeof message.enemyId === 'string' ? zoneEnemies.get(state.zoneId).get(message.enemyId) : null;

      if (enemy && !enemy.dead) {
        state.targetEnemyId = enemy.id;
      } else {
        state.targetEnemyId = null;
        state.autoAttack = false;
      }
    } else if (message.type === 'autoattack') {
      const state = players.get(id);
      if (!state || state.dead) return;

      state.autoAttack = Boolean(message.active) && state.targetEnemyId !== null;
    } else if (message.type === 'ability') {
      const state = players.get(id);
      if (!state) return;

      const slot = Number.parseInt(message.slot, 10);
      if (!Number.isInteger(slot)) return;

      if (isLoading(state)) return;
      useAbility(id, state, zoneEnemies.get(state.zoneId), slot, (payload) => sendToZone(state.zoneId, payload), notify, onKill);
    } else if (message.type === 'loot-open') {
      const state = players.get(id);
      if (!state || typeof message.lootId !== 'string') return;

      openLoot(lootContainers, id, state, message.lootId, notify);
    } else if (message.type === 'loot-take') {
      const state = players.get(id);
      if (!state || typeof message.lootId !== 'string') return;

      const entryId = Number.parseInt(message.entryId, 10);
      if (!Number.isInteger(entryId)) return;

      takeLootEntry(lootContainers, id, state, message.lootId, entryId, notify);
    } else if (message.type === 'loot-take-all') {
      const state = players.get(id);
      if (!state || typeof message.lootId !== 'string') return;

      takeAllLoot(lootContainers, id, state, message.lootId, notify);
    } else if (message.type === 'item-use') {
      const state = players.get(id);
      if (!state) return;

      const slot = Number.parseInt(message.slot, 10);
      if (!Number.isInteger(slot)) return;

      useInventoryItem(id, state, slot, notify);
    } else if (message.type === 'item-destroy') {
      const state = players.get(id);
      if (!state || typeof message.itemId !== 'string') return;

      const slot = Number.parseInt(message.slot, 10);
      if (!Number.isInteger(slot)) return;

      destroyInventoryItem(id, state, slot, message.itemId, notify);
    } else if (message.type === 'item-move') {
      const state = players.get(id);
      if (!state) return;

      moveInventoryItem(id, state, Number.parseInt(message.from, 10), Number.parseInt(message.to, 10), notify);
    } else if (message.type === 'item-unequip') {
      const state = players.get(id);
      if (!state || typeof message.slot !== 'string') return;

      unequipItem(id, state, message.slot, notify);
    } else if (message.type === 'zone-enter') {
      const state = players.get(id);
      if (state && typeof message.teleporterId === 'string') enterTeleporter(id, state, message.teleporterId);
    } else if (message.type === 'zone-ready') {
      const state = players.get(id);
      if (state) state.loadingUntil = 0;
    } else if (message.type === 'npc-interact') {
      const state = players.get(id);
      if (state) openNpc(state, id, message.npcId, notify);
    } else if (message.type === 'quest-accept') {
      const state = players.get(id);
      if (state && typeof message.questId === 'string') {
        acceptNpcQuest(state, id, message.npcId, message.questId, notify);
      }
    } else if (message.type === 'quest-complete') {
      const state = players.get(id);
      if (state && typeof message.questId === 'string') {
        completeNpcQuest(state, id, message.npcId, message.questId, notify);
      }
    } else if (message.type === 'vendor-open') {
      const state = players.get(id);
      if (state) openVendor(state, id, message.npcId, notify);
    } else if (message.type === 'vendor-buy') {
      const state = players.get(id);
      if (!state || typeof message.itemId !== 'string') return;

      buyFromVendor(state, id, message.npcId, message.itemId, Number(message.quantity), notify);
    } else if (message.type === 'vendor-sell') {
      const state = players.get(id);
      if (!state || typeof message.itemId !== 'string') return;

      const slot = Number.parseInt(message.slot, 10);
      if (!Number.isInteger(slot)) return;

      sellToVendor(state, id, message.npcId, slot, message.itemId, notify);
    }
  });

  socket.on('close', () => {
    const state = removePlayer(id);
    if (state) {
      persistState(state).catch((error) => console.error('Fehler beim Speichern der Position:', error));
    }
    console.log(`Client getrennt (${id})`);
  });

  socket.on('error', (error) => {
    console.error('Socket-Fehler:', error);
  });
});

function isLoading(state) {
  return Date.now() < state.loadingUntil;
}

function sendToZone(zoneId, message) {
  const data = JSON.stringify(message);
  for (const [playerId, state] of players) {
    if (state.zoneId !== zoneId || isLoading(state)) continue;
    const socket = sockets.get(playerId);
    if (socket && socket.readyState === socket.OPEN) socket.send(data);
  }
}

function enterTeleporter(playerId, state, teleporterId) {
  if (state.dead || isLoading(state)) return;

  const teleporter = getZone(state.zoneId).teleporters.find((candidate) => candidate.id === teleporterId);
  if (!teleporter) return;

  if (Math.hypot(state.x - teleporter.x, state.z - teleporter.z) > TELEPORT_RANGE) {
    notify(playerId, { type: 'event', kind: 'zone-failed', reason: 'too-far' });
    return;
  }

  changeZone(playerId, state, teleporter.zone, teleporter.spawn);
}

function changeZone(playerId, state, zoneId, spawnId) {
  const target = getZone(zoneId);
  const spawn = target?.spawns[spawnId];
  if (!spawn) return;

  const previousZoneId = state.zoneId;
  removeLootOfPlayer(lootContainers, playerId);

  state.zoneId = zoneId;
  state.x = spawn.x;
  state.y = spawn.y;
  state.z = spawn.z;
  state.rotationY = spawn.rotationY;
  state.velocityY = 0;
  state.isGrounded = true;
  state.input.moveX = 0;
  state.input.moveZ = 0;
  state.input.jump = false;
  state.targetEnemyId = null;
  state.autoAttack = false;
  state.loadingUntil = Date.now() + ZONE_LOAD_TIMEOUT_MS;
  state.dataVersion += 1;

  sendToZone(previousZoneId, { type: 'leave', id: playerId });

  notify(playerId, {
    type: 'zone',
    world: serializeZone(target),
    enemies: serializeEnemies(zoneEnemies.get(zoneId)),
    npcs: serializeNpcs(zoneId),
    position: { x: spawn.x, y: spawn.y, z: spawn.z, rotationY: spawn.rotationY },
  });

  persistState(state).catch((error) => console.error('Fehler beim Speichern der Zone:', error));
}

function simulate() {
  for (const state of players.values()) {
    if (state.dead || isLoading(state)) continue;

    const { input } = state;

    const speed = input.run ? RUN_SPEED : WALK_SPEED;
    state.x += input.moveX * speed * TICK_DELTA;
    state.z += input.moveZ * speed * TICK_DELTA;

    if (input.moveX !== 0 || input.moveZ !== 0) {
      state.rotationY = Math.atan2(input.moveX, input.moveZ);
    }

    if (input.jump && state.isGrounded) {
      state.velocityY = JUMP_SPEED;
      state.isGrounded = false;
    }

    state.velocityY -= GRAVITY * TICK_DELTA;
    state.y += state.velocityY * TICK_DELTA;

    resolveCollisions(state, PLAYER_RADIUS);

    if (state.y <= GROUND_Y) {
      state.y = GROUND_Y;
      state.velocityY = 0;
      state.isGrounded = true;
    }
  }
}

setInterval(() => {
  simulate();

  for (const zone of getZones()) {
    const enemies = zoneEnemies.get(zone.id);
    const zonePlayers = new Map();
    for (const [id, state] of players) {
      if (state.zoneId === zone.id && !isLoading(state)) zonePlayers.set(id, state);
    }

    updateEnemies(enemies, zonePlayers, TICK_DELTA);
    updateCombat(zonePlayers, enemies, TICK_DELTA, (payload) => sendToZone(zone.id, payload), notify, onKill);

    if (zonePlayers.size === 0) continue;

    const snapshot = {};
    for (const [id, state] of zonePlayers) {
      snapshot[id] = {
        x: state.x,
        y: state.y,
        z: state.z,
        rotationY: state.rotationY,
        characterName: state.characterName,
        level: state.level,
        health: state.health,
        healthMax: state.healthMax,
        dead: state.dead,
        autoAttack: state.autoAttack,
        equipment: state.equipment,
        appearance: state.appearance,
      };
    }
    sendToZone(zone.id, { type: 'state', players: snapshot, enemies: serializeEnemyStates(enemies) });
  }

  updateLootContainers(lootContainers, TICK_DELTA, notify);
  if (players.size === 0) return;

  for (const [id, state] of players) {
    const questView = serializeQuestLog(state);
    const questViewKey = JSON.stringify(questView);

    if (questViewKey !== state.questViewKey) {
      for (const event of diffQuestLog(state.questView, questView)) {
        notify(id, event);
      }

      state.questView = questView;
      state.questViewKey = questViewKey;
      notify(id, { type: 'quests', ...questView });
    }

    notify(id, {
      type: 'self',
      level: state.level,
      xp: state.xp,
      xpToNextLevel: xpToNextLevel(state.level),
      gold: state.gold,
      armor: state.armor,
      damageMin: state.damageMin + state.equipDamageMin,
      damageMax: state.damageMax + state.equipDamageMax,
      resource: state.resource,
      resourceMax: state.resourceMax,
      cooldowns: state.cooldowns,
    });
  }
}, TICK_INTERVAL_MS);

setInterval(() => {
  for (const state of players.values()) {
    persistState(state).catch((error) => console.error('Fehler beim Speichern der Position:', error));
  }
}, SAVE_INTERVAL_MS);

setInterval(() => {
  for (const client of wss.clients) {
    if (client.isAlive === false) {
      client.terminate();
      continue;
    }

    client.isAlive = false;
    client.ping();
  }
}, 10000);
