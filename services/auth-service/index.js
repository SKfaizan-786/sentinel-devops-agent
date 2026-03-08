const express = require('express');
const app = express();
const port = 3001;

// We fake the health status here
let healthStatus = 'healthy'; 

app.get('/health', (req, res) => {
  // Simulate slow response
  if (healthStatus === 'slow') {
    setTimeout(() => {
      res.json({ status: 'slow', timestamp: new Date() });
    }, 2000); // 2 seconds delay
  } 
  // Simulate degraded state (4xx error)
  else if (healthStatus === 'degraded') {
    res.status(429).json({ status: 'degraded', error: 'Rate limit exceeded', message: 'Service is experiencing high load' });
  }
  // Simulate crash/error
  else if (healthStatus === 'down') {
    res.status(500).json({ status: 'down', error: 'Database connection failed' });
  } 
  // Normal healthy response
  else {
    res.json({ 
      status: 'ok', 
      service: 'auth-service', 
      cpu: Math.random() * 100, // Fake CPU usage
      memory: Math.random() * 500
    });
  }
});

// Endpoint to force the service to fail (for your Demo)
app.post('/simulate/:mode', (req, res) => {
  healthStatus = req.params.mode; // mode can be: healthy, slow, down, degraded
  console.log(`[Simulation] Switched to mode: ${healthStatus}`);
  res.json({ message: `Service is now simulating: ${healthStatus}` });
});

const server = app.listen(port, () => {
  console.log(`Auth Service listening on port ${port}`);
});

/**
 * Graceful shutdown handler for auth service
 * @param {string} signal - The termination signal received
 */
function gracefulShutdown(signal) {
  console.log(`\n🔄 Auth service received ${signal}. Starting graceful shutdown...`);
  
  // Start a fail-safe timeout to prevent hanging
  const failSafeTimeout = setTimeout(() => {
    console.error('❌ Auth service could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
  
  try {
    // Close HTTP server (stop accepting new requests)
    server.close((err) => {
      if (err) {
        console.error('❌ Error closing auth service HTTP server:', err);
        clearTimeout(failSafeTimeout);
        process.exit(1);
      } else {
        console.log('✅ Auth service HTTP server closed successfully');
        clearTimeout(failSafeTimeout);
        console.log('✅ Auth service graceful shutdown complete');
        process.exit(0);
      }
    });
  } catch (error) {
    console.error('❌ Error during auth service graceful shutdown:', error);
    clearTimeout(failSafeTimeout);
    process.exit(1);
  }
}

// Attach signal listeners for graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
