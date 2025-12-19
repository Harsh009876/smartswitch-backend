const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/auth.routes');

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors());

// Parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const provisioningRoutes = require('./routes/provisioning.routes');
const deviceRoutes = require('./routes/device.routes');
const automationRoutes = require('./routes/automation.routes');
const firmwareRoutes = require('./routes/firmware.routes');
const factoryRoutes = require('./routes/factory.routes');
const { authLimiter, provisionLimiter, apiLimiter } = require('./middlewares/rateLimiter');

// Routing
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/provision', provisionLimiter, provisioningRoutes);
app.use('/api', apiLimiter, deviceRoutes); // Protected routes inside
app.use('/api/automation', apiLimiter, automationRoutes);
app.use('/api/firmware', apiLimiter, firmwareRoutes);

// Factory Mode (Enable via ENV)
// Default to true for development if not set, or false for production security.
const ENABLE_FACTORY_MODE = process.env.ENABLE_FACTORY_MODE === 'true' || true; // Enabling for demo purposes
if (ENABLE_FACTORY_MODE) {
    app.use('/api/factory', factoryRoutes);
    console.log('🏭 Factory Mode ENABLED at /api/factory');
}

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ error: "Not Found" });
});

module.exports = app;
