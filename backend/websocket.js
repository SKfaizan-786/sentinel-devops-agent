const WebSocket = require('ws');

let wss = null;
let pingInterval = null;

function setupWebSocket(server) {
  wss = new WebSocket.Server({ server });

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
  pingInterval = setInterval(() => {
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
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
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

/**
 * Gracefully close the WebSocket server
 * @returns {Promise<void>}
 */
function closeWebSocketServer() {
  return new Promise((resolve) => {
    if (!wss) {
      console.log('ℹ️ WebSocket server not initialized');
      resolve();
      return;
    }

    console.log('🔄 Closing WebSocket server...');
    
    // Clear ping interval
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }

    // Close all client connections
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1001, 'Server shutting down');
      }
    });

    // Close the server
    wss.close((err) => {
      if (err) {
        console.error('❌ Error closing WebSocket server:', err);
      } else {
        console.log('✅ WebSocket server closed successfully');
      }
      resolve();
    });
  });
}

module.exports = { setupWebSocket, closeWebSocketServer };
