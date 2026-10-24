const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const SERVER_PORT = 8088;

export const GAME_VERSION = '1.07';

export function buildServerUrl() {
  return `${protocol}://${window.location.hostname}:${SERVER_PORT}/`;
}
