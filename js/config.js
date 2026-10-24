const secure = window.location.protocol === 'https:';
const SERVER_PORT = 8088;
const SERVER_PATH = '/ws';

export const GAME_VERSION = '1.16';

export function buildServerUrl() {
  if (secure) return `wss://${window.location.host}${SERVER_PATH}`;
  return `ws://${window.location.hostname}:${SERVER_PORT}/`;
}
