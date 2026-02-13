const WebSocket = require('ws');

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  const clients = new Set();

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('🔌 Client connected');

    // Heartbeat
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('close', () => {
      clients.delete(ws);
      console.log('🔌 Client disconnected');
    });

    // Send initial test message
    ws.send(JSON.stringify({ type: 'INIT', data: { message: 'Connected to Sentinel WebSocket' } }));
  });

  // Ping interval to keep connections alive and detect stale ones
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        ws.terminate();
        return;
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  return {
    broadcast: (type, data) => {
      const message = JSON.stringify({ type, data });
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  };
}

module.exports = { setupWebSocket };
