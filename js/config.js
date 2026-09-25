const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const SERVER_PORT = 8088;
const PORTAL_PORT = 8081;

export function buildServerUrl(token) {
  return `${protocol}://${window.location.hostname}:${SERVER_PORT}/?token=${encodeURIComponent(token)}`;
}

export function getPortalUrl() {
  return `${window.location.protocol}//${window.location.hostname}:${PORTAL_PORT}/`;
}
