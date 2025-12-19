const rateLimit = require('express-rate-limit');

// Note: Using MemoryStore by default. 
// For distributed scaling, we'd wrap this with 'rate-limit-redis', but to save dependencies/complexity we use memory 
// which is sufficient for single-instance backend.

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: { message: 'Too many login attempts, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

const provisionLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: { message: 'Too many provisioning requests from this IP' }
});

const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 calls per minute
    message: { message: 'Too many API requests' }
});

module.exports = { authLimiter, provisionLimiter, apiLimiter };
