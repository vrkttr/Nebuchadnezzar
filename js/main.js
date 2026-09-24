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
  { SERVER_URL },
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
  import(v('./config.js')),
]);

const renderer = createRenderer();
const scene = createScene();
const { spawnPoint } = createTestZone(scene);

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
const remotePlayers = createRemotePlayers(scene);

let ownPlayerId = null;

const connection = createServerConnection(SERVER_URL, {
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
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
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
