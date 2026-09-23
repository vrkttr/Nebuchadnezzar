import * as THREE from 'three';
import { createPlayer } from './Player.js';
import { dampFactor, lerpAngle } from '../utils/Interpolation.js';

// Andere Farbe als die eigene Spielerfigur, zur visuellen Unterscheidung.
const REMOTE_PLAYER_COLOR = 0xd9534f;

// Höherer Wert = schnelleres Einlaufen auf die vom Server gemeldete
// Position, glättet aber die durch die 50ms-Update-Rate entstehenden
// Sprünge merklich.
const SMOOTHING = 12;

/**
 * Hält eine Map von Spieler-ID -> Platzhalterfigur für alle anderen,
 * aktuell mit dem Server verbundenen Spieler. Die tatsächliche Position
 * läuft pro Frame sanft auf den zuletzt vom Server empfangenen Zielwert
 * ein (Interpolation), statt bei jedem Server-Update hart zu springen.
 */
export function createRemotePlayers(scene) {
  const remotePlayers = new Map();

  function upsert(id, state) {
    let remote = remotePlayers.get(id);

    if (!remote) {
      const created = createPlayer(REMOTE_PLAYER_COLOR);
      scene.add(created.object);

      remote = {
        object: created.object,
        setPosition: created.setPosition,
        target: new THREE.Vector3(state.x, state.y, state.z),
        targetRotationY: state.rotationY ?? 0,
      };

      // Beim ersten Erscheinen direkt an die richtige Stelle setzen,
      // damit die Figur nicht sichtbar von (0,0,0) aus "einläuft".
      remote.setPosition(state.x, state.y, state.z);
      remote.object.rotation.y = remote.targetRotationY;

      remotePlayers.set(id, remote);
      return;
    }

    remote.target.set(state.x, state.y, state.z);
    remote.targetRotationY = state.rotationY ?? remote.targetRotationY;
  }

  function remove(id) {
    const remote = remotePlayers.get(id);
    if (!remote) return;
    scene.remove(remote.object);
    remotePlayers.delete(id);
  }

  /**
   * Gleicht die aktuell angezeigten Platzhalterfiguren mit dem vom
   * Server empfangenen Gesamtzustand ab. ownId wird übersprungen,
   * damit die eigene Spielerfigur nicht doppelt dargestellt wird.
   */
  function sync(playersState, ownId) {
    const seenIds = new Set();

    for (const [id, state] of Object.entries(playersState)) {
      if (id === ownId) continue;
      seenIds.add(id);
      upsert(id, state);
    }

    for (const id of remotePlayers.keys()) {
      if (!seenIds.has(id)) remove(id);
    }
  }

  /** Läuft die Positionen/Rotationen aller entfernten Spieler sanft an ihr Ziel heran. Pro Frame aufrufen. */
  function update(delta) {
    const factor = dampFactor(SMOOTHING, delta);
    for (const remote of remotePlayers.values()) {
      remote.object.position.lerp(remote.target, factor);
      remote.object.rotation.y = lerpAngle(remote.object.rotation.y, remote.targetRotationY, factor);
    }
  }

  return { sync, remove, update };
}
