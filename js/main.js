const VERSION = new URL(import.meta.url).searchParams.get('v') ?? '';
const v = (path) => (VERSION ? `${path}?v=${VERSION}` : path);

const [
  THREE,
  { createRenderer },
  { createScene, applyLighting, followSun, flagShadows },
  { createThirdPersonCamera },
  { buildZone, disposeZone },
  { createZoneStreamer },
  { createAmbient },
  { createTrain },
  { createTerrain },
  { createPlayer },
  { createPlayerController },
  { createServerConnection },
  { createRemotePlayers },
  { createEnemies },
  { dampFactor, lerpAngle },
  { createDialogue },
  { createIcon },
  { createTooltip },
  { createItemMenu },
  { createConfirmDialog },
  { createCharacterWindow },
  { createInventory },
  { createLootWindow },
  { createLootMarkers },
  { createWorldChests },
  { createQuestObjects },
  { createNpcs },
  { createNpcWindow },
  { createVendorWindow },
  { createWindowManager },
  { createChat },
  { createGroupFrames },
  { createViewCapture },
  { createMinimap },
  { createWorldMap },
  { createPortraits },
  { createDamageNumbers },
  { createChatBubbles },
  { createShotEffects },
  { createPlane },
  { createIntroWindow },
  { createAbilitiesWindow },
  { createQuestWindow },
  { createSocialWindow },
  { createAbilityDrag },
  { allowLeave, armAutoFullscreen },
  { createTouchControls },
  { createHud },
  { createLoadingScreen },
  { createAudio },
  { createFootsteps },
  { createDrips },
  { createAtmosphere },
  { setPuddleExclusions },
  { applyGraphics },
  { updateSewer, isInWater },
  { gameState },
  { buildServerUrl, getPortalUrl },
  { initI18n, t, has, applyDom },
  { localizeMessage },
] = await Promise.all([
  import('three'),
  import(v('./core/Renderer.js')),
  import(v('./core/Scene.js')),
  import(v('./core/ThirdPersonCamera.js')),
  import(v('./world/ZoneBuilder.js')),
  import(v('./world/ZoneStreamer.js')),
  import(v('./entities/Ambient.js')),
  import(v('./entities/Train.js')),
  import(v('./world/Terrain.js')),
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
  import(v('./entities/WorldChests.js')),
  import(v('./entities/QuestObjects.js')),
  import(v('./entities/Npcs.js')),
  import(v('./ui/NpcWindow.js')),
  import(v('./ui/VendorWindow.js')),
  import(v('./ui/WindowManager.js')),
  import(v('./ui/Chat.js')),
  import(v('./ui/GroupFrames.js')),
  import(v('./core/ViewCapture.js')),
  import(v('./hud/Minimap.js')),
  import(v('./hud/WorldMap.js')),
  import(v('./hud/Portraits.js')),
  import(v('./hud/DamageNumbers.js')),
  import(v('./hud/ChatBubbles.js')),
  import(v('./effects/ShotEffects.js')),
  import(v('./effects/Plane.js')),
  import(v('./ui/IntroWindow.js')),
  import(v('./ui/AbilitiesWindow.js')),
  import(v('./ui/QuestWindow.js')),
  import(v('./ui/SocialWindow.js')),
  import(v('./ui/AbilityDrag.js')),
  import(v('./input/Keyboard.js')),
  import(v('./input/Touch.js')),
  import(v('./hud/Hud.js')),
  import(v('./ui/LoadingScreen.js')),
  import(v('./audio/Audio.js')),
  import(v('./audio/Footsteps.js')),
  import(v('./effects/Drips.js')),
  import(v('./effects/Atmosphere.js')),
  import(v('./world/builders/Puddles.js')),
  import(v('./effects/Graphics.js')),
  import(v('./world/builders/Sewer.js')),
  import(v('./state/GameState.js')),
  import(v('./config.js')),
  import(v('./i18n/I18n.js')),
  import(v('./i18n/Localizer.js')),
]);

await initI18n();
applyDom();

function start(token) {
  const loadingScreen = createLoadingScreen();
  const renderer = createRenderer();
  const scene = createScene();
  const terrain = createTerrain(scene);
  const ambient = createAmbient(scene, terrain.heightAt);
  const train = createTrain({
    heightAt: terrain.heightAt,
    scene,
    label: (id, fallback) => (has(`train.stop.${id}`) ? t(`train.stop.${id}`) : fallback),
    onHorn: (x, z) => audio.playAt('train_horn', x, z, 1, TRAIN_HORN_RANGE),
  });
  const spawnPoint = new THREE.Vector3();
  let zone = null;
  let streamer = null;

  const dialogue = createDialogue();
  const audio = createAudio();
  audio.startAmbient();

  const ui = {
    createIcon,
    tooltip: createTooltip(gameState),
    itemMenu: createItemMenu(),
    confirmDialog: createConfirmDialog(),
    abilityDrag: createAbilityDrag({
      onDrop: (slot, abilityId, fromSlot) => connection.send({ type: 'actionbar-set', slot, abilityId, fromSlot }),
      onRemove: (slot) => connection.send({ type: 'actionbar-set', slot, abilityId: null }),
    }),
  };

  const hud = createHud(gameState, {
    onItemDrop: (slot, itemId) => connection.send({ type: 'actionbar-set', slot, abilityId: `item:${itemId}` }),
    onAbility: (slot) => connection.send({ type: 'ability', slot }),
    onGuildInvite: () => {
      if (gameState.playerTarget) connection.send({ type: 'guild-invite', playerId: gameState.playerTarget });
    },
    onGuildKick: () => {
      if (gameState.playerTarget) connection.send({ type: 'guild-kick', playerId: gameState.playerTarget });
    },
    onInvite: () => {
      if (gameState.playerTarget) connection.send({ type: 'group-invite', playerId: gameState.playerTarget });
    },
    ui,
  });

  const npcWindow = createNpcWindow(gameState, ui, {
    onAccept: (npcId, questId) => connection.send({ type: 'quest-accept', npcId, questId }),
    onComplete: (npcId, questId) => connection.send({ type: 'quest-complete', npcId, questId }),
    onVendor: (npcId) => connection.send({ type: 'vendor-open', npcId }),
    onGuildCreate: (npcId, name) => connection.send({ type: 'guild-create', npcId, name }),
    onGuildLeave: (npcId) => connection.send({ type: 'guild-leave', npcId }),
    onInnBind: (npcId) => connection.send({ type: 'inn-bind', npcId }),
    onBarberPreview: (appearance) => player.setAppearance(appearance),
    onBarberApply: (npcId, appearance) => connection.send({ type: 'barber-apply', npcId, appearance }),
  });
  const abilitiesWindow = createAbilitiesWindow(ui);
  const questWindow = createQuestWindow({
    confirmDialog: ui.confirmDialog,
    onAbandon: (questId) => connection.send({ type: 'quest-abandon', questId }),
  });
  const socialWindow = createSocialWindow({
    onRequest: () => connection.send({ type: 'social-request' }),
    onAddFriend: (name) => connection.send({ type: 'friend-add', name }),
    onRemoveFriend: (name) => connection.send({ type: 'friend-remove', name }),
    onInvite: (playerId) => connection.send({ type: 'group-invite', playerId }),
  });
  const vendorWindow = createVendorWindow(gameState, ui, {
    onBuy: (npcId, itemId, quantity) =>
      connection.send({ type: 'vendor-buy', npcId, itemId, quantity }),
  });
  const footsteps = createFootsteps(audio, isInWater);
  const drips = createDrips(scene, audio);
  audio.bindUi(document);
  let ownWeapon = null;
  let zoneEmitters = [];

  function openPortalMenu() {
    allowLeave();
    window.location.href = `${getPortalUrl()}settings.php`;
  }

  document.querySelector('#minimap-buttons button[data-i18n-title="hud.menu.menu"]')?.addEventListener('click', openPortalMenu);

  const inventory = createInventory(gameState, ui, {
    onUse: (slot) => connection.send({ type: 'item-use', slot }),
    onDestroy: (slot, itemId) => connection.send({ type: 'item-destroy', slot, itemId }),
    onSell: (slot, itemId) =>
      connection.send({ type: 'vendor-sell', npcId: vendorWindow.currentNpcId(), slot, itemId }),
    onMove: (from, to) => {
      audio.play('bag_move');
      connection.send({ type: 'item-move', from, to });
    },
    isVendorOpen: () => vendorWindow.isOpen(),
  });
  const characterWindow = createCharacterWindow(gameState, ui, {
    onUnequip: (slot) => connection.send({ type: 'item-unequip', slot }),
  });
  const windowManager = createWindowManager();
  for (const name of ['inventory', 'loot', 'npc', 'vendor', 'character', 'map', 'intro', 'abilities', 'quests', 'social']) {
    windowManager.register(document.getElementById(`${name}-window`), name);
  }

  const lootMarkers = createLootMarkers(scene);
  const worldChests = createWorldChests(scene);
  const questObjects = createQuestObjects(scene);
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
  const RIDING_SMOOTHING = 40;
  const TRAIN_HORN_RANGE = 65;
  let riding = false;
  const LOOT_CLOSE_RANGE = 6;
  const NPC_CLOSE_RANGE = 6;

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  const atmosphere = createAtmosphere({ scene, camera, renderer });
  const thirdPersonCamera = createThirdPersonCamera(camera, renderer.domElement);
  const playerController = createPlayerController(camera);
  const nameplateContainer = document.getElementById('nameplates');
  const remotePlayers = createRemotePlayers(scene, camera, nameplateContainer);
  const enemies = createEnemies(scene, camera, nameplateContainer, player.object.position);
  const npcs = createNpcs(scene, camera, nameplateContainer);

  const viewCapture = createViewCapture(renderer);
  const worldMap = createWorldMap({
    scene,
    renderer,
    viewCapture,
    player,
    sources: { npcs: npcs.getMarkers },
  });
  document.querySelector('#minimap-buttons button[data-i18n-title="hud.menu.map"]')?.addEventListener('click', () => worldMap.toggle());
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
      marks: worldMap.getMarkers,
    },
  });
  const portraits = createPortraits({ scene, renderer, viewCapture, player, enemies, remotePlayers, gameState });
  const damageNumbers = createDamageNumbers(camera, nameplateContainer);
  const chatBubbles = createChatBubbles(camera, nameplateContainer);
  const shotEffects = createShotEffects(scene);
  const plane = createPlane(scene);
  const introWindow = createIntroWindow({
    onClose: () => connection.send({ type: 'intro-seen' }),
  });
  const chat = createChat({ onSend: (text) => connection.send({ type: 'chat', text }) });

  function selectPlayer(id) {
    if (!remotePlayers.getObject(id)) return;
    gameState.target = null;
    enemies.clearSelection();
    connection.send({ type: 'target', enemyId: null });
    gameState.playerTarget = id;
    audio.play('target_select');
  }

  const groupFrames = createGroupFrames({
    onSelect: selectPlayer,
    onLeave: () => connection.send({ type: 'group-leave' }),
    onKick: (playerId) => connection.send({ type: 'group-kick', playerId }),
    onPromote: (playerId) => connection.send({ type: 'group-promote', playerId }),
    onAnswer: (accept, kind) => connection.send({ type: kind === 'guild' ? 'guild-answer' : 'group-answer', accept }),
  });

  remotePlayers.setRelationResolver((id, data) => {
    if (groupFrames.getGroup()?.members.some((member) => member.id === id)) return 'party';
    if (gameState.player.guildName && data.guildName === gameState.player.guildName) return 'guild';
    return null;
  });

  let ownPlayerId = null;
  let questMarkers = {};
  let outdoorCameraDistance = null;
  let wasIndoor = false;
  const INDOOR_CAMERA_DISTANCE = 3.2;

  function resetZoneEntities() {
    gameState.target = null;
    gameState.playerTarget = null;
    connection.send({ type: 'target', enemyId: null });
    enemies.clear();
    npcs.clear();
    remotePlayers.clear();
    lootMarkers.clear();
    worldChests.clear();
    questObjects.clear();
    lootWindow.hide();
    npcWindow.hide();
    vendorWindow.hide();
    chatBubbles.clear();
    worldMap.hide();
  }

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  async function enterZone(message, firstLoad) {
    const world = message.world;
    loadingScreen.show(world.name, Boolean(world.indoor));
    loadingScreen.setProgress(0.08, firstLoad ? t('loading.status.world') : t('loading.status.zone'));

    if (streamer) {
      streamer.dispose();
      streamer = null;
    }
    ambient.clear();
    train.clear();
    terrain.clear();
    riding = false;
    if (zone) {
      disposeZone(scene, zone);
      zone = null;
    }
    if (!firstLoad) resetZoneEntities();

    setPuddleExclusions(world.train?.crossings);
    zone = buildZone(scene, world);
    terrain.setZone(world);
    train.setRoute(world.train);
    if (world.chunked) {
      streamer = createZoneStreamer({
        scene,
        zoneGroup: zone.zone,
        world,
        send: (payload) => connection.send(payload),
        onBlockers: (list) => {
          thirdPersonCamera.setBlockers(list);
          enemies.setBlockers(list);
        },
        onEmitters: (list) => audio.setEmitters(list),
        onPath: (object) => ambient.addPath(object),
        onPathRemoved: (id) => ambient.removePath(id),
      });
    }
    applyLighting(scene, world);
    atmosphere.setWorld(world);
    plane.setEnabled(world.id === 'startwelt');
    audio.setIndoor(Boolean(world.indoor));
    audio.setEmitters(zone.emitters);
    drips.setSources(zone.drips);
    thirdPersonCamera.setBlockers(world.cameraBlockers ?? []);
    enemies.setBlockers(world.cameraBlockers ?? []);
    if (world.indoor && !wasIndoor) outdoorCameraDistance = thirdPersonCamera.getDistance();
    thirdPersonCamera.setDistance(world.indoor ? INDOOR_CAMERA_DISTANCE : outdoorCameraDistance ?? thirdPersonCamera.getDistance());
    wasIndoor = Boolean(world.indoor);
    gameState.zoneName = world.name;

    const position = message.position ?? { x: 0, y: 0, z: 0, rotationY: 0 };
    ownTargetPosition.set(position.x, position.y, position.z);
    player.object.position.copy(ownTargetPosition);
    ownTargetRotationY = position.rotationY ?? 0;
    player.object.rotation.y = ownTargetRotationY;
    thirdPersonCamera.setYaw(ownTargetRotationY + Math.PI);

    enemies.sync(message.enemies ?? []);
    npcs.sync(message.npcs ?? []);
    worldChests.sync(message.chests ?? []);
    npcs.setMarkers(questMarkers);
    loadingScreen.setProgress(0.4, t('loading.status.textures'));

    if (streamer) {
      const activeStreamer = streamer;
      activeStreamer.setBudget(20);
      let finished = false;
      const loadRadius = Math.hypot(world.width, world.height);
      const ready = activeStreamer.whenReady(position.x, position.z, loadRadius).then(() => {
        finished = true;
      });
      while (!finished && streamer === activeStreamer) {
        loadingScreen.setProgress(0.4 + 0.4 * activeStreamer.progress(position.x, position.z, loadRadius), t('loading.status.world'));
        await Promise.race([ready, nextFrame()]);
      }
      activeStreamer.setBudget(5);
    }

    await nextFrame();
    await loadingScreen.assetsIdle();
    loadingScreen.setProgress(0.85, t('loading.status.sounds'));
    await audio.ready();
    loadingScreen.setProgress(0.93, t('loading.status.graphics'));

    try {
      await renderer.compileAsync(scene, camera);
    } catch {
      renderer.compile(scene, camera);
    }
    await nextFrame();
    await nextFrame();

    worldMap.captureZone(world, [
      player.object,
      ...enemies.getObjects(),
      ...npcs.getObjects(),
      ...worldChests.getObjects(),
      ...lootMarkers.getObjects(),
    ]);
    loadingScreen.setProgress(1, t('loading.status.ready'));
    connection.send({ type: 'zone-ready' });
    await loadingScreen.hide();
  }

  let connectionOpened = false;
  let leavingPage = false;
  window.addEventListener('pagehide', () => {
    leavingPage = true;
  });

  function showConnectionLost(key) {
    if (document.getElementById('connection-lost')) return;
    const overlay = document.createElement('div');
    overlay.id = 'connection-lost';
    const box = document.createElement('div');
    box.className = 'window nu-taped';
    const title = document.createElement('div');
    title.className = 'connection-lost-title';
    title.textContent = t('connection.lost.title');
    const text = document.createElement('p');
    text.textContent = t(key);
    const button = document.createElement('button');
    button.className = 'window-button';
    button.textContent = t('connection.lost.ok');
    button.addEventListener('click', () => window.location.reload());
    box.append(title, text, button);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    button.focus();
  }

  const connection = createServerConnection(buildServerUrl(token), {
    onOpen() {
      connectionOpened = true;
    },
    onClose(event) {
      if (leavingPage) return;
      if (event?.code === 4001 || event?.code === 4002) {
        allowLeave();
        window.location.replace(getPortalUrl());
        return;
      }
      showConnectionLost(connectionOpened ? 'connection.lost.closed' : 'connection.lost.unreachable');
    },
    onMessage(message) {
      localizeMessage(message);
      if (message.type === 'init') {
        ownPlayerId = message.id;
        gameState.player.classId = message.classId ?? null;
        if (message.home) gameState.home = { zoneId: message.home.zoneId, readyAt: message.home.readyAt };
        if (message.autoFullscreen) armAutoFullscreen();
        touchControls.setMode(message.touchControls);
        audio.applySettings(message.audio);
        applyGraphics(message.graphics);
        ownWeapon = message.equipment?.weapon ?? null;
        enterZone(message, true).then(() => {
          if (message.showIntro) introWindow.show();
        });
        hud.setAbilities(message.abilities ?? [], message.actionItems ?? []);
        abilitiesWindow.render(message.abilities ?? []);
        gameState.items = Object.fromEntries((message.items ?? []).map((item) => [item.id, item]));
        inventory.render(message.inventory ?? []);
        characterWindow.render(message.equipment ?? {});
        player.setEquipment(message.equipment);
        player.setAppearance(message.appearance);
      } else if (message.type === 'appearance') {
        player.setAppearance(message.appearance);
      } else if (message.type === 'abilities') {
        hud.setAbilities(message.abilities ?? [], message.actionItems ?? []);
        abilitiesWindow.render(message.abilities ?? []);
      } else if (message.type === 'zone') {
        enterZone(message, false);
      } else if (message.type === 'chunks') {
        streamer?.receive(message);
      } else if (message.type === 'chat') {
        chat.add(message);
        if (message.channel === 'say') {
          chatBubbles.show(
            message.fromId === ownPlayerId ? player.object : remotePlayers.getObject(message.fromId),
            message.text,
            message.fromId === ownPlayerId ? null : remotePlayers.getNameplate(message.fromId)
          );
        }
      } else if (message.type === 'speech') {
        const isNpc = message.source === 'npc';
        const speaker = isNpc ? npcs.getObject(message.id) : ambient.getObject(message.id);
        const height = isNpc || ambient.getKind(message.id) !== 'dog' ? undefined : 1.1;
        chatBubbles.show(speaker, t(message.key), isNpc ? npcs.getPlate(message.id) : null, height);
      } else if (message.type === 'group') {
        groupFrames.setGroup(message, ownPlayerId);
      } else if (message.type === 'group-invite') {
        groupFrames.showInvite(t('group.inviteText', { name: message.fromName }), 'group');
      } else if (message.type === 'guild-invite') {
        groupFrames.showInvite(t('guild.inviteText', { name: message.fromName, guild: message.guildName }), 'guild');
      } else if (message.type === 'social') {
        socialWindow.setData(message);
      } else if (message.type === 'quests') {
        hud.setQuests(message);
        questWindow.setQuests(message);
        questMarkers = message.markers ?? {};
        questObjects.sync(message.objects ?? []);
        npcs.setMarkers(questMarkers);
      } else if (message.type === 'train') {
        train.receive(message);
      } else if (message.type === 'ambient') {
        ambient.applyServer(message);
      } else if (message.type === 'home') {
        gameState.home = { zoneId: message.zoneId, readyAt: message.readyAt };
      } else if (message.type === 'hearth') {
        if (message.state === 'start') {
          hud.startCast(t('hearth.cast'), message.duration);
        } else {
          hud.stopCast();
          if (message.reason === 'moved' || message.reason === 'damaged' || message.reason === 'cancelled') {
            hud.addEvent({ kind: 'hearth-cancelled' });
          }
        }
      } else if (message.type === 'npc-window') {
        audio.play(`npc_${message.npcId}_greet`);
        npcWindow.show(message);
      } else if (message.type === 'vendor-window') {
        npcWindow.hide();
        vendorWindow.show(message);
      } else if (message.type === 'equipment') {
        characterWindow.render(message.slots ?? {});
        player.setEquipment(message.slots);
        ownWeapon = message.slots?.weapon ?? null;
      } else if (message.type === 'inventory') {
        inventory.render(message.slots ?? []);
      } else if (message.type === 'chest-remove') {
        worldChests.remove(message.id);
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
        riding = Boolean(message.riding);
      } else if (message.type === 'event') {
        hud.addEvent(message);
        audio.playEvent(message);
        if (message.kind === 'quest-inspect' && message.text) dialogue.show(message.text);
      } else if (message.type === 'damage') {
        audio.playDamage(message, ownPlayerId);
        const isEnemyTarget = message.targetType === 'enemy';
        const isOwnTarget = !isEnemyTarget && message.targetId === ownPlayerId;
        const hitObject = isEnemyTarget
          ? enemies.getObject(message.targetId)
          : isOwnTarget
            ? player.object
            : remotePlayers.getObject(message.targetId);

        if (hitObject) {
          let kind = 'other';
          if (isEnemyTarget && message.attackerId === ownPlayerId) kind = 'dealt';
          if (isOwnTarget) kind = 'taken';
          damageNumbers.spawn(hitObject.position, message.amount, kind);
        }

        const attackerIsOwn = message.attackerId === ownPlayerId;
        const isRanged = Boolean(message.weaponId && gameState.items[message.weaponId]?.ranged);
        if (isEnemyTarget && hitObject) {
          const attackerObject = attackerIsOwn ? player.object : remotePlayers.getObject(message.attackerId);
          if (isRanged) {
            const shotName = audio.shotSound(message.weaponId);
            if (shotName && attackerIsOwn) audio.play(shotName);
            else if (shotName && attackerObject) audio.playAt(shotName, attackerObject.position.x, attackerObject.position.z);
            audio.playAt('hit_bullet', hitObject.position.x, hitObject.position.z);
            if (attackerObject) shotEffects.spawn(attackerObject.position, hitObject.position);
          } else {
            const family = attackerIsOwn ? audio.weaponFamily(ownWeapon) : 'blunt';
            if (attackerIsOwn) audio.play(`swing_${family}`);
            else if (attackerObject) audio.playAt(`swing_${family}`, attackerObject.position.x, attackerObject.position.z);
            audio.playAt(`hit_${family}`, hitObject.position.x, hitObject.position.z);
          }
          const type = enemies.getType(message.targetId);
          if (type && Math.random() < 0.25) audio.playAt(`enemy_grunt_${type}`, hitObject.position.x, hitObject.position.z, 0.8);
        } else if (isOwnTarget) {
          const attackerObject = enemies.getObject(message.attackerId);
          if (attackerObject) audio.playAt('enemy_attack', attackerObject.position.x, attackerObject.position.z);
        }

        if (isEnemyTarget) enemies.playHit(message.targetId);
        else if (isOwnTarget) player.playHit();
        else remotePlayers.playHit(message.targetId);

        if (message.targetType === 'enemy' && message.attackerId) {
          if (message.attackerId === ownPlayerId) player.playAttack(isRanged ? 'shot' : 'melee');
          else remotePlayers.playAttack(message.attackerId, isRanged ? 'shot' : 'melee');
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
          gameState.player.guildName = ownState.guildName ?? null;
          gameState.player.guildLeader = Boolean(ownState.guildLeader);
          if (ownState.characterName) {
            gameState.player.name = ownState.characterName;
          }
        }
        remotePlayers.sync(message.players, ownPlayerId);
        for (const enemyId of message.enemyRemoves ?? []) enemies.remove(enemyId);
        for (const data of message.enemyAdds ?? []) if (!enemies.has(data.id)) enemies.add(data);
        if (message.enemies) {
          enemies.applyStates(message.enemies);
        }
        if (ownState) {
          const wasAlive = !gameState.player.dead;
          gameState.player.health = ownState.health;
          gameState.player.healthMax = ownState.healthMax;
          gameState.player.dead = Boolean(ownState.dead);
          player.setDead(gameState.player.dead);
          if (wasAlive && gameState.player.dead) {
            audio.play('player_death');
            dialogue.show(t('death.text'));
          }
        }
      } else if (message.type === 'leave') {
        remotePlayers.remove(message.id);
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
      !current.userData.isPlayer &&
      !current.userData.isLoot &&
      !current.userData.isChest &&
      !current.userData.isQuestObject &&
      !current.userData.isTeleporter
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
      [...npcs.getObjects(), ...enemies.getObjects(), ...remotePlayers.getObjects(), ...lootMarkers.getObjects(), ...worldChests.getObjects(), ...questObjects.getObjects(), ...(zone?.teleporters ?? [])],
      true
    );

    if (intersections.length === 0) return null;
    return resolveInteractable(intersections[0].object);
  }

  renderer.domElement.addEventListener('click', (event) => {
    if (event.buttons & 2) return;
    const target = pickInteractable(event);
    if (!target) return;

    if (target.userData.isNpc) {
      connection.send({ type: 'npc-interact', npcId: target.userData.npcId });
    } else if (target.userData.isTeleporter) {
      connection.send({ type: 'zone-enter', teleporterId: target.userData.teleporterId });
    } else if (target.userData.isQuestObject) {
      connection.send({ type: 'quest-inspect', objectId: target.userData.questObjectId });
    } else if (target.userData.isChest) {
      connection.send({ type: 'chest-open', chestId: target.userData.chestId });
    } else if (target.userData.isLoot) {
      connection.send({ type: 'loot-open', lootId: target.userData.lootId });
    } else if (target.userData.isPlayer) {
      selectPlayer(target.userData.playerId);
    } else if (target.userData.isEnemy) {
      const data = enemies.findDataByObject(target);
      if (data) {
        gameState.target = data;
        gameState.playerTarget = null;
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

  const TOUCH_PIXEL_RATIO_LIMIT = 1.25;
  const touchControls = createTouchControls({
    canvas: renderer.domElement,
    labels: {
      jump: t('touch.jump'),
      jumpTitle: t('touch.jump'),
      crouch: t('touch.crouch'),
      crouchTitle: t('touch.crouchTitle'),
      target: t('touch.target'),
      targetTitle: t('touch.targetTitle'),
    },
    onRotate: (dx, dy) => thirdPersonCamera.rotate(dx, dy),
    onZoom: (delta) => thirdPersonCamera.zoom(delta),
    onCycleTarget: () => cycleTarget(),
    onToggle: (enabled) => {
      renderer.setPixelRatio(enabled ? Math.min(window.devicePixelRatio || 1, TOUCH_PIXEL_RATIO_LIMIT) : window.devicePixelRatio || 1);
      renderer.setSize(window.innerWidth, window.innerHeight);
    },
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

  const TAB_TARGET_RANGE = 35;
  let tabVisited = new Set();

  function cycleTarget() {
    const candidates = enemies.getTargetCandidates(TAB_TARGET_RANGE);
    if (candidates.length === 0) return;

    if (gameState.target) tabVisited.add(gameState.target.id);

    let next = candidates.find((id) => !tabVisited.has(id));
    if (!next) {
      tabVisited = new Set(gameState.target ? [gameState.target.id] : []);
      next = candidates.find((id) => !tabVisited.has(id)) ?? candidates[0];
    }

    const data = enemies.getData(next);
    if (!data) return;

    gameState.target = data;
    gameState.playerTarget = null;
    audio.play('target_select');
    enemies.select(data.id);
    connection.send({ type: 'target', enemyId: data.id, tab: true });
  }

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

      if (introWindow.isOpen()) {
        introWindow.hide();
        return;
      }

      if (
        npcWindow.isOpen() ||
        vendorWindow.isOpen() ||
        lootWindow.isOpen() ||
        inventory.isOpen() ||
        characterWindow.isOpen() ||
        abilitiesWindow.isOpen() ||
        questWindow.isOpen() ||
        socialWindow.isOpen() ||
        worldMap.isOpen()
      ) {
        abilitiesWindow.hide();
        questWindow.hide();
        socialWindow.hide();
        npcWindow.hide();
        vendorWindow.hide();
        lootWindow.hide();
        inventory.hide();
        characterWindow.hide();
        worldMap.hide();
        return;
      }

      if (gameState.playerTarget) {
        gameState.playerTarget = null;
        return;
      }

      if (gameState.target) {
        gameState.target = null;
        enemies.clearSelection();
        connection.send({ type: 'target', enemyId: null });
        return;
      }

      openPortalMenu();
      return;
    }

    if (event.code === 'KeyM' && !event.repeat) {
      worldMap.toggle();
      return;
    }

    if (event.code === 'KeyB' && !event.repeat) {
      inventory.toggle();
      return;
    }

    if (event.code === 'KeyO' && !event.repeat) {
      socialWindow.toggle();
      return;
    }

    if (event.code === 'KeyQ' && !event.repeat) {
      questWindow.toggle();
      return;
    }

    if (event.code === 'KeyF' && !event.repeat) {
      abilitiesWindow.toggle();
      return;
    }

    if (event.code === 'Tab') {
      event.preventDefault();
      if (!event.repeat) cycleTarget();
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

  const cameraFocus = new THREE.Vector3();
  const CAMERA_HIDE_DISTANCE = 1.6;
  let playerHiddenFromCamera = false;

  function setPlayerHiddenFromCamera(hidden) {
    if (hidden === playerHiddenFromCamera) return;
    playerHiddenFromCamera = hidden;
    player.object.traverse((node) => {
      if (hidden) node.layers.disable(0);
      else node.layers.enable(0);
    });
  }

  const clock = new THREE.Clock();
  const listenerForward = new THREE.Vector3();

  const INPUT_SEND_INTERVAL = 0.05;
  let inputSendTimer = 0;
  let shadowTimer = 0;

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    const factor = dampFactor(riding ? RIDING_SMOOTHING : SMOOTHING, delta);
    player.object.position.lerp(ownTargetPosition, factor);
    player.object.rotation.y = lerpAngle(player.object.rotation.y, ownTargetRotationY, factor);
    player.update(delta);
    streamer?.update(player.object.position.x, player.object.position.z);
    ambient.update(delta, player.object.position);
    train.update(delta);
    atmosphere.update(delta, player.object.position);
    followSun(scene, player.object.position.x, player.object.position.z);
    shadowTimer += delta;
    if (shadowTimer > 0.5) {
      shadowTimer = 0;
      flagShadows(scene);
      atmosphere.scan();
    }
    const rideVelocity = train.rideVelocity();
    const supportHeight = Math.max(terrain.heightAt(player.object.position.x, player.object.position.z), riding ? train.deckHeight : 0);
    player.setGroundHeight(supportHeight);
    player.setGroundVelocity(riding ? rideVelocity.x : 0, riding ? rideVelocity.z : 0);
    footsteps.setGroundVelocity(riding ? rideVelocity.x : 0, riding ? rideVelocity.z : 0);
    remotePlayers.setEnvironment(rideVelocity.x, rideVelocity.z, terrain.heightAt, train.deckHeight);
    updateSewer(delta);
    drips.update(delta, player.object.position);
    remotePlayers.update(delta);
    enemies.update(delta);
    questObjects.update(delta);
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
    cameraFocus.set(player.object.position.x, player.object.position.y + 1.4, player.object.position.z);
    setPlayerHiddenFromCamera(camera.position.distanceTo(cameraFocus) < CAMERA_HIDE_DISTANCE);
    camera.getWorldDirection(listenerForward);
    audio.setListener(player.object.position.x, player.object.position.z, listenerForward.x, listenerForward.z);
    footsteps.update(delta, player.object.position, [...enemies.getMarkers(), ...remotePlayers.getMarkers()], supportHeight);
    audio.setNpcSources(npcs.getMarkers());
    audio.update(delta);
    if (gameState.target) gameState.playerTarget = null;
    gameState.playerTargetData = gameState.playerTarget ? remotePlayers.getData(gameState.playerTarget) : null;
    if (gameState.playerTarget && !gameState.playerTargetData) gameState.playerTarget = null;
    const ownGroup = groupFrames.getGroup();
    gameState.canInviteTarget = Boolean(
      gameState.playerTargetData &&
        (!ownGroup ||
          (ownGroup.leaderId === ownPlayerId &&
            ownGroup.members.length < 5 &&
            !ownGroup.members.some((member) => member.id === gameState.playerTarget)))
    );
    gameState.canGuildInviteTarget = Boolean(gameState.playerTargetData && gameState.player.guildName && !gameState.playerTargetData.guildName);
    gameState.canGuildKickTarget = Boolean(
      gameState.playerTargetData &&
        gameState.player.guildLeader &&
        gameState.player.guildName &&
        gameState.playerTargetData.guildName === gameState.player.guildName
    );
    hud.update();

    inputSendTimer += delta;
    if (inputSendTimer >= INPUT_SEND_INTERVAL) {
      inputSendTimer = 0;
      const inputState = playerController.getInputState();
      const crouching = inputState.crouch && !gameState.player.dead;
      player.setCrouch(crouching);
      hud.setCrouch(crouching);
      connection.send({ type: 'input', ...inputState });
    }

    damageNumbers.update(delta);
    chatBubbles.update(delta);
    shotEffects.update(delta);
    plane.update(delta);
    minimap.update(delta);
    worldMap.update(delta);
    portraits.update(delta);

    renderer.render(scene, camera);
  }

  animate();
}

const token = new URLSearchParams(window.location.search).get('token');

if (token) {
  start(token);
} else {
  allowLeave();
  window.location.replace(getPortalUrl());
}
