const { metrics } = require('./prometheus');

function metricsMiddleware(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    let path = req.route?.path || req.path;
    
    // Normalize paths too avoid high cardinality for Prometheus labels
    path = path.replace(/\/\d+/g, '/:id')
               .replace(/\/[0-9a-fA-F-]{36}/g, '/:id');
    
    // Skip metrics endpoint to avoid recursion
    if (path === '/metrics') return;
    
    metrics.httpRequestsTotal.inc({
      method: req.method,
      path: path,
      status: res.statusCode
    });
    
    metrics.httpRequestDuration.observe(
      { method: req.method, path: path },
      duration
    );
  });
  
  next();
}

module.exports = { metricsMiddleware };
