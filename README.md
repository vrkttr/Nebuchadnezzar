# Projekt Nebuchadnezzar

Browserbasiertes, serverautoritatives 3D-MMORPG (Aufbau von Grund auf).

## Starten (Docker Compose Stack)

```bash
docker compose up -d --build
```

- Client: `http://<Host>:8082`
- Game-Server (WebSocket): Port `8083`

Der Client ermittelt Host/Protokoll für die Server-Verbindung automatisch
aus der aufgerufenen URL (siehe `js/config.js`) — keine manuelle
Anpassung bei IP-Wechsel nötig.

## Struktur

```
index.html           Einstiegspunkt des Clients
js/                   Client-Code (Three.js, kein Build-Tool, reines JS)
  core/               Renderer, Szene, Kamera
  world/               Zonen-Inhalte
  entities/             Spieler, später NPCs/Gegner
  input/                Tastatursteuerung
  network/              WebSocket-Client
  vendor/               lokal eingebundenes Three.js
server/               Node.js-Game-Server (WebSocket)
docker-compose.yml    Stack: game (Client) + game-server
```

## Aktueller Stand

- 3D-Rendering, Testzone, Spielerfigur, Third-Person-Kamera, WASD-Steuerung funktionsfähig
- Grundlegende Server-Verbindung steht, Positions-Synchronisation ist der nächste Schritt
