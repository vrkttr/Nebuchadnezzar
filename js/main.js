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

createServerConnection(SERVER_URL);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// --- Render-Loop ---
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  playerController.update(delta);
  thirdPersonCamera.update(player.object.position);

  renderer.render(scene, camera);
}

animate();
