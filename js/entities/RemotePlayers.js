import { createPlayer } from './Player.js';

// Andere Farbe als die eigene Spielerfigur, zur visuellen Unterscheidung.
const REMOTE_PLAYER_COLOR = 0xd9534f;

/**
 * Hält eine Map von Spieler-ID -> Platzhalterfigur für alle anderen,
 * aktuell mit dem Server verbundenen Spieler, und hält sie anhand der
 * vom Server empfangenen Zustände synchron.
 */
export function createRemotePlayers(scene) {
  const remotePlayers = new Map();

  function upsert(id, state) {
    let remote = remotePlayers.get(id);
    if (!remote) {
      remote = createPlayer(REMOTE_PLAYER_COLOR);
      scene.add(remote.object);
      remotePlayers.set(id, remote);
    }
    remote.setPosition(state.x, state.y, state.z);
    remote.object.rotation.y = state.rotationY ?? 0;
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

  return { sync, remove };
}
