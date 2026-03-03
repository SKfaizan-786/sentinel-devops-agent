const rateLimit = require('express-rate-limit');

// General API limit: 100 requests per minute per IP
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many requests, please slow down.',
        retryAfter: 60,
    },
});

module.exports = { apiLimiter };