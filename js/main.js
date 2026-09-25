const VERSION = new URL(import.meta.url).searchParams.get('v') ?? '';
const v = (path) => (VERSION ? `${path}?v=${VERSION}` : path);

const [
  THREE,
  { createRenderer },
  { createScene },
  { createThirdPersonCamera },
  { createTestZone },
  { createPlayer },
  { createPlayerController },
  { createServerConnection },
  { createRemotePlayers },
  { dampFactor, lerpAngle },
  { createDialogue },
  { buildServerUrl, getPortalUrl },
] = await Promise.all([
  import('three'),
  import(v('./core/Renderer.js')),
  import(v('./core/Scene.js')),
  import(v('./core/ThirdPersonCamera.js')),
  import(v('./world/TestZone.js')),
  import(v('./entities/Player.js')),
  import(v('./entities/PlayerController.js')),
  import(v('./network/ServerConnection.js')),
  import(v('./entities/RemotePlayers.js')),
  import(v('./utils/Interpolation.js')),
  import(v('./ui/Dialogue.js')),
  import(v('./config.js')),
]);

function start(token) {
  const renderer = createRenderer();
  const scene = createScene();
  const { spawnPoint, npcs } = createTestZone(scene);

  const dialogue = createDialogue();

  const player = createPlayer();
  player.setPosition(spawnPoint.x, spawnPoint.y, spawnPoint.z);
  scene.add(player.object);

  const ownTargetPosition = new THREE.Vector3(spawnPoint.x, spawnPoint.y, spawnPoint.z);
  let ownTargetRotationY = 0;
  const SMOOTHING = 12;

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

  let ownPlayerId = null;

  const connection = createServerConnection(buildServerUrl(token), {
    onMessage(message) {
      if (message.type === 'init') {
        ownPlayerId = message.id;
      } else if (message.type === 'state') {
        const ownState = ownPlayerId ? message.players[ownPlayerId] : null;
        if (ownState) {
          ownTargetPosition.set(ownState.x, ownState.y, ownState.z);
          ownTargetRotationY = ownState.rotationY ?? ownTargetRotationY;
        }
        remotePlayers.sync(message.players, ownPlayerId);
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

  renderer.domElement.addEventListener('click', (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersections = raycaster.intersectObjects(npcs, true);

    if (intersections.length === 0) return;

    let target = intersections[0].object;
    while (target && !target.userData.isNpc) {
      target = target.parent;
    }

    if (target) {
      dialogue.show(target.userData.dialogue);
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
    remotePlayers.update(delta);

    thirdPersonCamera.update(player.object.position);

    inputSendTimer += delta;
    if (inputSendTimer >= INPUT_SEND_INTERVAL) {
      inputSendTimer = 0;
      connection.send({ type: 'input', ...playerController.getInputState() });
    }

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
