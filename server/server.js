import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 8081;
const wss = new WebSocketServer({ port: PORT });

console.log(`Nebuchadnezzar Game-Server läuft auf Port ${PORT}`);

wss.on('connection', (socket) => {
  console.log('Neuer Client verbunden');

  socket.send(JSON.stringify({
    type: 'welcome',
    message: 'Verbindung zum Server hergestellt',
  }));

  socket.on('message', (data) => {
    console.log('Nachricht empfangen:', data.toString());
  });

  socket.on('close', () => {
    console.log('Client getrennt');
  });

  socket.on('error', (error) => {
    console.error('Socket-Fehler:', error);
  });
});
