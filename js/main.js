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
const playerController = createPlayerController(camera);
const remotePlayers = createRemotePlayers(scene);

// --- Server-Verbindung ---
let ownPlayerId = null;

const connection = createServerConnection(SERVER_URL, {
  onMessage(message) {
    if (message.type === 'init') {
      ownPlayerId = message.id;
    } else if (message.type === 'state') {
      // Die eigene Position/Rotation kommt jetzt ausschließlich vom
      // Server zurück (serverautoritative Bewegung) — der Client setzt
      // sie nicht mehr selbst.
      const ownState = ownPlayerId ? message.players[ownPlayerId] : null;
      if (ownState) {
        player.setPosition(ownState.x, ownState.y, ownState.z);
        player.object.rotation.y = ownState.rotationY ?? player.object.rotation.y;
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

// --- Render-Loop ---
const clock = new THREE.Clock();

const INPUT_SEND_INTERVAL = 0.05; // Sekunden zwischen Eingabe-Updates an den Server
let inputSendTimer = 0;

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  thirdPersonCamera.update(player.object.position);

  inputSendTimer += delta;
  if (inputSendTimer >= INPUT_SEND_INTERVAL) {
    inputSendTimer = 0;
    connection.send({ type: 'input', ...playerController.getInputState() });
  }

  renderer.render(scene, camera);
}

animate();
