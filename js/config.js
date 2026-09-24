const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const SERVER_PORT = 8088;

export const SERVER_URL = `${protocol}://${window.location.hostname}:${SERVER_PORT}`;
