// Zentrale Konfigurationswerte des Game-Clients.
//
// SERVER_URL wird automatisch aus der aufgerufenen Seite ermittelt:
// - Protokoll: ws:// bei http-Zugriff, wss:// bei https-Zugriff
// - Host: derselbe Host, über den der Client aufgerufen wurde (IP oder Domain)
// - Port: 8081 (siehe docker-compose.yml, game-server-Container)
//
// Dadurch ist keine manuelle Anpassung nötig, egal ob per VPS-IP ohne
// Domain oder später per Domain mit TLS aufgerufen wird.
const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const SERVER_PORT = 8081;

export const SERVER_URL = `${protocol}://${window.location.hostname}:${SERVER_PORT}`;
