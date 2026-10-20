const VERSION = new URL(import.meta.url).searchParams.get('v') ?? '';
const v = (path) => (VERSION ? `${path}?v=${VERSION}` : path);

const [
  THREE,
  { createRenderer },
  { createScene },
  { createThirdPersonCamera },
  { createStartwelt },
  { createPlayer },
  { createPlayerController },
  { createServerConnection },
  { createRemotePlayers },
  { createEnemies },
  { dampFactor, lerpAngle },
  { createDialogue },
  { createIcon },
  { createTooltip, SLOT_LABELS },
  { createItemMenu },
  { createConfirmDialog },
  { createCharacterWindow },
  { createInventory },
  { createLootWindow },
  { createLootMarkers },
  { createNpcs },
  { createNpcWindow },
  { createVendorWindow },
  { createMenuWindow },
  { createWindowManager },
  { createChat },
  { createViewCapture },
  { createMinimap },
  { createPortraits },
  { createHud },
  { createAudio },
  { gameState },
  { buildServerUrl, getCreditsUrl, getPortalUrl },
] = await Promise.all([
  import('three'),
  import(v('./core/Renderer.js')),
  import(v('./core/Scene.js')),
  import(v('./core/ThirdPersonCamera.js')),
  import(v('./world/Startwelt.js')),
  import(v('./entities/Characters.js')),
  import(v('./entities/PlayerController.js')),
  import(v('./network/ServerConnection.js')),
  import(v('./entities/RemotePlayers.js')),
  import(v('./entities/Enemies.js')),
  import(v('./utils/Interpolation.js')),
  import(v('./ui/Dialogue.js')),
  import(v('./ui/Icons.js')),
  import(v('./ui/Tooltip.js')),
  import(v('./ui/ItemMenu.js')),
  import(v('./ui/ConfirmDialog.js')),
  import(v('./ui/CharacterWindow.js')),
  import(v('./ui/Inventory.js')),
  import(v('./ui/LootWindow.js')),
  import(v('./entities/LootMarkers.js')),
  import(v('./entities/Npcs.js')),
  import(v('./ui/NpcWindow.js')),
  import(v('./ui/VendorWindow.js')),
  import(v('./ui/MenuWindow.js')),
  import(v('./ui/WindowManager.js')),
  import(v('./ui/Chat.js')),
  import(v('./core/ViewCapture.js')),
  import(v('./hud/Minimap.js')),
  import(v('./hud/Portraits.js')),
  import(v('./hud/Hud.js')),
  import(v('./audio/Audio.js')),
  import(v('./state/GameState.js')),
  import(v('./config.js')),
]);

function start(token) {
  const renderer = createRenderer();
  const scene = createScene();
  const { spawnPoint } = createStartwelt(scene);

  const dialogue = createDialogue();
  const audio = createAudio();
  audio.startAmbient();

  const ui = {
    createIcon,
    tooltip: createTooltip(gameState),
    itemMenu: createItemMenu(),
    confirmDialog: createConfirmDialog(),
    slotLabels: SLOT_LABELS,
  };

  const hud = createHud(gameState, {
    onAbility: (slot) => connection.send({ type: 'ability', slot }),
    ui,
  });

  const npcWindow = createNpcWindow(gameState, ui, {
    onAccept: (npcId, questId) => connection.send({ type: 'quest-accept', npcId, questId }),
    onComplete: (npcId, questId) => connection.send({ type: 'quest-complete', npcId, questId }),
    onVendor: (npcId) => connection.send({ type: 'vendor-open', npcId }),
  });
  const vendorWindow = createVendorWindow(gameState, ui, {
    onBuy: (npcId, itemId, quantity) =>
      connection.send({ type: 'vendor-buy', npcId, itemId, quantity }),
  });
  const menuWindow = createMenuWindow(audio, getCreditsUrl());

  const inventory = createInventory(gameState, ui, {
    onUse: (slot) => connection.send({ type: 'item-use', slot }),
    onDestroy: (slot, itemId) => connection.send({ type: 'item-destroy', slot, itemId }),
    onSell: (slot, itemId) =>
      connection.send({ type: 'vendor-sell', npcId: vendorWindow.currentNpcId(), slot, itemId }),
    isVendorOpen: () => vendorWindow.isOpen(),
  });
  const characterWindow = createCharacterWindow(gameState, ui, {
    onUnequip: (slot) => connection.send({ type: 'item-unequip', slot }),
  });
  const windowManager = createWindowManager();
  for (const name of ['inventory', 'loot', 'npc', 'vendor', 'menu', 'character']) {
    windowManager.register(document.getElementById(`${name}-window`), name);
  }

  const lootMarkers = createLootMarkers(scene);
  const lootWindow = createLootWindow(gameState, ui, {
    onTake: (lootId, entryId) => connection.send({ type: 'loot-take', lootId, entryId }),
    onTakeAll: (lootId) => connection.send({ type: 'loot-take-all', lootId }),
  });

  const player = createPlayer();
  player.setPosition(spawnPoint.x, spawnPoint.y, spawnPoint.z);
  scene.add(player.object);

  const ownTargetPosition = new THREE.Vector3(spawnPoint.x, spawnPoint.y, spawnPoint.z);
  let ownTargetRotationY = 0;
  const SMOOTHING = 12;
  const LOOT_CLOSE_RANGE = 6;
  const NPC_CLOSE_RANGE = 6;

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  const thirdPersonCamera = createThirdPersonCamera(camera, renderer.domElement);
  const playerController = createPlayerController(camera);
  const nameplateContainer = document.getElementById('nameplates');
  const remotePlayers = createRemotePlayers(scene, camera, nameplateContainer);
  const enemies = createEnemies(scene, camera, nameplateContainer);
  const npcs = createNpcs(scene, camera, nameplateContainer);

  const viewCapture = createViewCapture(renderer);
  const minimap = createMinimap({
    scene,
    camera,
    renderer,
    viewCapture,
    player,
    sources: {
      enemies: enemies.getMarkers,
      npcs: npcs.getMarkers,
      players: remotePlayers.getMarkers,
    },
  });
  const portraits = createPortraits({ scene, renderer, viewCapture, player, enemies, gameState });
  const chat = createChat({ onSend: (text) => connection.send({ type: 'chat', text }) });

  let ownPlayerId = null;

  const connection = createServerConnection(buildServerUrl(token), {
    onMessage(message) {
      if (message.type === 'init') {
        ownPlayerId = message.id;
        enemies.sync(message.enemies ?? []);
        npcs.sync(message.npcs ?? []);
        hud.setAbilities(message.abilities ?? []);
        gameState.items = Object.fromEntries((message.items ?? []).map((item) => [item.id, item]));
        inventory.render(message.inventory ?? []);
        characterWindow.render(message.equipment ?? {});
        player.setEquipment(message.equipment);
      } else if (message.type === 'chat') {
        chat.add(message);
      } else if (message.type === 'quests') {
        hud.setQuests(message);
        npcs.setMarkers(message.markers ?? {});
      } else if (message.type === 'npc-window') {
        npcWindow.show(message);
      } else if (message.type === 'vendor-window') {
        npcWindow.hide();
        vendorWindow.show(message);
      } else if (message.type === 'equipment') {
        characterWindow.render(message.slots ?? {});
        player.setEquipment(message.slots);
      } else if (message.type === 'inventory') {
        inventory.render(message.slots ?? []);
      } else if (message.type === 'loot-spawn') {
        lootMarkers.add(message);
      } else if (message.type === 'loot-window') {
        if (!lootWindow.isOpen()) audio.play('loot_open');
        lootWindow.show(message);
      } else if (message.type === 'loot-remove') {
        lootMarkers.remove(message.id);
        if (lootWindow.currentId() === message.id) lootWindow.hide();
      } else if (message.type === 'self') {
        gameState.player.level = message.level;
        gameState.player.xp = message.xp;
        gameState.player.xpToNextLevel = message.xpToNextLevel;
        gameState.player.gold = message.gold;
        gameState.player.armor = message.armor;
        gameState.player.damageMin = message.damageMin;
        gameState.player.damageMax = message.damageMax;
        gameState.player.resource = message.resource;
        gameState.player.resourceMax = message.resourceMax;
        gameState.player.cooldowns = message.cooldowns ?? {};
      } else if (message.type === 'event') {
        hud.addEvent(message);
        audio.playEvent(message);
      } else if (message.type === 'damage') {
        audio.playDamage(message, ownPlayerId);
        if (message.targetType === 'enemy' && message.attackerId) {
          if (message.attackerId === ownPlayerId) player.playAttack();
          else remotePlayers.playAttack(message.attackerId);
        } else if (message.targetType === 'player' && message.attackerId) {
          enemies.playAttack(message.attackerId);
        }
      } else if (message.type === 'state') {
        const ownState = ownPlayerId ? message.players[ownPlayerId] : null;
        if (ownState) {
          const jumpDistance = ownTargetPosition.distanceTo(
            new THREE.Vector3(ownState.x, ownState.y, ownState.z)
          );
          ownTargetPosition.set(ownState.x, ownState.y, ownState.z);
          if (jumpDistance > 5) {
            player.object.position.copy(ownTargetPosition);
          }
          ownTargetRotationY = ownState.rotationY ?? ownTargetRotationY;
          if (ownState.characterName) {
            gameState.player.name = ownState.characterName;
          }
        }
        remotePlayers.sync(message.players, ownPlayerId);
        if (message.enemies) {
          enemies.applyStates(message.enemies);
        }
        if (ownState) {
          const wasAlive = !gameState.player.dead;
          gameState.player.health = ownState.health;
          gameState.player.healthMax = ownState.healthMax;
          gameState.player.dead = Boolean(ownState.dead);
          if (wasAlive && gameState.player.dead) {
            audio.play('player_death');
            dialogue.show(
              'Du bist gefallen, hast die Erfahrung dieses Levels verloren und wurdest an deinem Spawnpunkt wiederbelebt.'
            );
          }
        }
      } else if (message.type === 'leave') {
        remotePlayers.remove(message.id);
      }
    },
    onClose() {
      if (!ownPlayerId) {
        window.location.replace(getPortalUrl());
      }
    },
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function resolveInteractable(hitObject) {
    let current = hitObject;
    while (
      current &&
      !current.userData.isNpc &&
      !current.userData.isEnemy &&
      !current.userData.isLoot
    ) {
      current = current.parent;
    }
    return current;
  }

  function pickInteractable(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersections = raycaster.intersectObjects(
      [...npcs.getObjects(), ...enemies.getObjects(), ...lootMarkers.getObjects()],
      true
    );

    if (intersections.length === 0) return null;
    return resolveInteractable(intersections[0].object);
  }

  renderer.domElement.addEventListener('click', (event) => {
    const target = pickInteractable(event);
    if (!target) return;

    if (target.userData.isNpc) {
      connection.send({ type: 'npc-interact', npcId: target.userData.npcId });
    } else if (target.userData.isLoot) {
      connection.send({ type: 'loot-open', lootId: target.userData.lootId });
    } else if (target.userData.isEnemy) {
      const data = enemies.findDataByObject(target);
      if (data) {
        gameState.target = data;
        audio.play('target_select');
        enemies.select(data.id);
        connection.send({ type: 'target', enemyId: data.id });
        connection.send({ type: 'autoattack', active: true });
      }
    }
  });

  renderer.domElement.addEventListener('mousemove', (event) => {
    const target = pickInteractable(event);

    if (!target) {
      renderer.domElement.style.cursor = 'default';
    } else if (target.userData.isEnemy) {
      renderer.domElement.style.cursor = 'crosshair';
    } else {
      renderer.domElement.style.cursor = 'pointer';
    }
  });

  const ABILITY_SLOT_BY_KEY = {
    Digit1: 1,
    Digit2: 2,
    Digit3: 3,
    Digit4: 4,
    Digit5: 5,
    Digit6: 6,
    Digit7: 7,
    Digit8: 8,
    Digit9: 9,
    Digit0: 10,
    Minus: 11,
    Equal: 12,
  };

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Escape') {
      if (ui.confirmDialog.isOpen()) {
        ui.confirmDialog.close();
        return;
      }

      if (ui.itemMenu.isOpen()) {
        ui.itemMenu.close();
        return;
      }

      if (
        menuWindow.isOpen() ||
        npcWindow.isOpen() ||
        vendorWindow.isOpen() ||
        lootWindow.isOpen() ||
        inventory.isOpen() ||
        characterWindow.isOpen()
      ) {
        menuWindow.hide();
        npcWindow.hide();
        vendorWindow.hide();
        lootWindow.hide();
        inventory.hide();
        characterWindow.hide();
        return;
      }

      if (gameState.target) {
        gameState.target = null;
        enemies.clearSelection();
        connection.send({ type: 'target', enemyId: null });
        return;
      }

      menuWindow.toggle();
      return;
    }

    if (event.code === 'KeyM' && !event.repeat) {
      menuWindow.toggle();
      return;
    }

    if (event.code === 'KeyB' && !event.repeat) {
      inventory.toggle();
      return;
    }

    if (event.code === 'KeyC' && !event.repeat) {
      characterWindow.toggle();
      return;
    }

    const slot = ABILITY_SLOT_BY_KEY[event.code];
    if (slot && !event.repeat) {
      connection.send({ type: 'ability', slot });
    }
  });

  const clock = new THREE.Clock();

  const INPUT_SEND_INTERVAL = 0.05;
  let inputSendTimer = 0;

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    const factor = dampFactor(SMOOTHING, delta);
    player.object.position.lerp(ownTargetPosition, factor);
    player.object.rotation.y = lerpAngle(player.object.rotation.y, ownTargetRotationY, factor);
    player.update(delta);
    remotePlayers.update(delta);
    enemies.update(delta);
    lootMarkers.update(delta);

    npcs.update(delta);

    if (characterWindow.isOpen()) characterWindow.update();

    for (const dialogWindow of [npcWindow, vendorWindow]) {
      if (!dialogWindow.isOpen()) continue;

      const npcPosition = npcs.getPosition(dialogWindow.currentNpcId());
      if (!npcPosition || player.object.position.distanceTo(npcPosition) > NPC_CLOSE_RANGE) {
        dialogWindow.hide();
      }
    }

    if (vendorWindow.isOpen()) vendorWindow.update();

    if (lootWindow.isOpen()) {
      const lootPosition = lootMarkers.getPosition(lootWindow.currentId());
      if (!lootPosition || player.object.position.distanceTo(lootPosition) > LOOT_CLOSE_RANGE) {
        lootWindow.hide();
      }
    }

    thirdPersonCamera.update(player.object.position);
    hud.update();

    inputSendTimer += delta;
    if (inputSendTimer >= INPUT_SEND_INTERVAL) {
      inputSendTimer = 0;
      connection.send({ type: 'input', ...playerController.getInputState() });
    }

    minimap.update(delta);
    portraits.update(delta);

    renderer.render(scene, camera);
  }

  animate();
}

const token = new URLSearchParams(window.location.search).get('token');

if (token) {
  start(token);
} else {
  window.location.replace(getPortalUrl());
}
