// Versionsnummer aus der eigenen Script-URL lesen (siehe index.html: js/main.js?v=X)
// und an alle eigenen Modul-Importe weiterreichen, damit Änderungen sofort
// wirksam werden und nicht durch Browser-/Proxy-Caching verzögert werden.
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
  import(v('./config.js')),
]);

// --- Grundaufbau ---
const renderer = createRenderer();
const scene = createScene();
const { spawnPoint } = createTestZone(scene);

const player = createPlayer();
player.setPosition(spawnPoint.x, spawnPoint.y, spawnPoint.z);
scene.add(player.object);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const thirdPersonCamera = createThirdPersonCamera(camera, renderer.domElement);
const playerController = createPlayerController(player, camera);
const remotePlayers = createRemotePlayers(scene);

// --- Server-Verbindung ---
let ownPlayerId = null;

const connection = createServerConnection(SERVER_URL, {
  onMessage(message) {
    if (message.type === 'init') {
      ownPlayerId = message.id;
    } else if (message.type === 'state') {
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

// --- Render-Loop ---
const clock = new THREE.Clock();

const POSITION_SEND_INTERVAL = 0.1; // Sekunden zwischen Positions-Updates an den Server
let sendTimer = 0;

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  playerController.update(delta);
  thirdPersonCamera.update(player.object.position);

  sendTimer += delta;
  if (sendTimer >= POSITION_SEND_INTERVAL) {
    sendTimer = 0;
    connection.send({
      type: 'position',
      x: player.object.position.x,
      y: player.object.position.y,
      z: player.object.position.z,
      rotationY: player.object.rotation.y,
    });
  }

  renderer.render(scene, camera);
}

animate();
