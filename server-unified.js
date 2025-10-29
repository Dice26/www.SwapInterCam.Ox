/**
 * SwapInterCam.ox - Unified MCP Server
 * Serves static frontend + MCP APIs + SWEP service with audit logging
 * 
 * Architecture: Single server for all services
 * - Static assets from /web
 * - MCP API at /api/mcp/*
 * - SWEP API at /api/swep/*
 * - Audit logs to /logs
 */

const path = require('path');
const fs = require('fs');
const express = require('express');
const app = express();

// ============================================
// Configuration (Environment-Driven)
// ============================================
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const STATIC_DIR = process.env.STATIC_DIR || path.resolve(__dirname, 'frontend');
const API_BASE = process.env.API_BASE || '/api';
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, 'logs');
const AUDIT_TAG = process.env.AUDIT_TAG || 'mcp-unified';
const NODE_ENV = process.env.NODE_ENV || 'development';
const COMMIT_ID = process.env.COMMIT_ID || '1593dde078969e57b9323a7cfdd847dcf9b1b867';

// ============================================
// Initialize Logging
// ============================================
fs.mkdirSync(LOG_DIR, { recursive: true });

const log = {
    access: (data) => {
        const line = JSON.stringify({
            ts: new Date().toISOString(),
            tag: AUDIT_TAG,
            ...data
        }) + '\n';
        fs.appendFile(path.join(LOG_DIR, 'access.log'), line, () => { });
    },
    runtime: (message) => {
        const line = `[${new Date().toISOString()}] ${AUDIT_TAG} ${message}\n`;
        fs.appendFile(path.join(LOG_DIR, 'runtime.log'), line, () => { });
        console.log(line.trim());
    },
    error: (message, error) => {
        const line = JSON.stringify({
            ts: new Date().toISOString(),
            tag: AUDIT_TAG,
            message,
            error: error?.message || error,
            stack: error?.stack
        }) + '\n';
        fs.appendFile(path.join(LOG_DIR, 'error.log'), line, () => { });
        console.error(line.trim());
    }
};

// ============================================
// Middleware: Request Audit Logger
// ============================================
app.use((req, res, next) => {
    const startTime = Date.now();

    // Log after response
    res.on('finish', () => {
        log.access({
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            duration: Date.now() - startTime,
            ip: req.headers['x-forwarded-for'] || req.ip,
            ua: req.headers['user-agent'] || ''
        });
    });

    next();
});

// ============================================
// Middleware: Security Headers
// ============================================
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');

    // HSTS only in production with HTTPS
    if (NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
});

// ============================================
// Middleware: Body Parsing
// ============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// Static Assets (Frontend)
// ============================================
app.use(express.static(STATIC_DIR, {
    etag: true,
    maxAge: NODE_ENV === 'production' ? '7d' : '0',
    setHeaders: (res, filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        const immutable = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.woff', '.woff2'];

        if (immutable.includes(ext)) {
            res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        } else if (ext === '.html') {
            res.setHeader('Cache-Control', 'public, max-age=300');
        } else {
            res.setHeader('Cache-Control', 'public, max-age=3600');
        }
    }
}));

// ============================================
// Health Check Endpoint
// ============================================
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        time: new Date().toISOString(),
        tag: AUDIT_TAG,
        env: NODE_ENV,
        commit: COMMIT_ID,
        staticDir: STATIC_DIR,
        services: {
            mcp: 'up',
            swep: 'up',
            web: 'up'
        }
    });
});

// Debug endpoint to check static directory
app.get('/debug', (req, res) => {
    const staticExists = fs.existsSync(STATIC_DIR);
    const indexExists = fs.existsSync(path.join(STATIC_DIR, 'index.html'));

    res.json({
        staticDir: STATIC_DIR,
        staticDirExists: staticExists,
        indexExists: indexExists,
        workingDir: __dirname,
        files: staticExists ? fs.readdirSync(STATIC_DIR) : []
    });
});

// ============================================
// API Routes
// ============================================

// MCP API Router
const mcpRouter = express.Router();

mcpRouter.get('/version', (req, res) => {
    res.json({
        service: 'MCP Backend',
        version: '1.0.0',
        commit: COMMIT_ID,
        env: NODE_ENV
    });
});

mcpRouter.get('/status', (req, res) => {
    res.json({
        api: 'up',
        time: new Date().toISOString(),
        endpoints: 25
    });
});

mcpRouter.get('/state', (req, res) => {
    // TODO: Integrate with actual state manager
    res.json({
        cameras: [],
        faceSwap: { active: false },
        obs: { connected: false }
    });
});

// TODO: Add more MCP endpoints
// mcpRouter.get('/cameras', ...);
// mcpRouter.post('/camera/select', ...);
// mcpRouter.post('/face-swap/start', ...);

// SWEP API Router
const swepRouter = express.Router();

swepRouter.get('/version', (req, res) => {
    res.json({
        service: 'SWEP Authentication',
        version: '1.0.0',
        commit: COMMIT_ID
    });
});

swepRouter.get('/status', (req, res) => {
    res.json({
        api: 'up',
        time: new Date().toISOString()
    });
});

// TODO: Add SWEP endpoints
// swepRouter.post('/auth/login', ...);
// swepRouter.get('/devices', ...);

// Mount API routers
app.use(`${API_BASE}/mcp`, mcpRouter);
app.use(`${API_BASE}/swep`, swepRouter);

// Legacy compatibility (redirect old endpoints)
app.use('/api', (req, res, next) => {
    // If not matched by routers above, try legacy paths
    if (req.path.startsWith('/cameras') || req.path.startsWith('/state')) {
        return res.redirect(308, `/api/mcp${req.path}`);
    }
    next();
});

// ============================================
// SPA Fallback (for client-side routing)
// ============================================
app.use((req, res, next) => {
    // Don't fallback for API routes
    if (req.path.startsWith(API_BASE)) {
        return next();
    }

    const indexPath = path.resolve(__dirname, STATIC_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
    }

    next();
});

// ============================================
// Error Handler
// ============================================
app.use((err, req, res, next) => {
    log.error('Unhandled error', err);

    res.status(err.status || 500).json({
        error: NODE_ENV === 'production' ? 'Internal server error' : err.message,
        path: req.path,
        timestamp: new Date().toISOString()
    });
});

// ============================================
// 404 Handler
// ============================================
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.path,
        timestamp: new Date().toISOString()
    });
});

// ============================================
// Start Server
// ============================================
const server = app.listen(PORT, HOST, () => {
    log.runtime(`Server started on ${HOST}:${PORT}`);
    log.runtime(`Environment: ${NODE_ENV}`);
    log.runtime(`Static dir: ${STATIC_DIR}`);
    log.runtime(`Static dir exists: ${fs.existsSync(STATIC_DIR)}`);
    log.runtime(`Index.html exists: ${fs.existsSync(path.join(STATIC_DIR, 'index.html'))}`);
    log.runtime(`API base: ${API_BASE}`);
    log.runtime(`Log dir: ${LOG_DIR}`);
    log.runtime(`Commit: ${COMMIT_ID}`);
});

// ============================================
// Graceful Shutdown
// ============================================
process.on('SIGTERM', () => {
    log.runtime('SIGTERM received, shutting down gracefully');
    server.close(() => {
        log.runtime('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    log.runtime('SIGINT received, shutting down gracefully');
    server.close(() => {
        log.runtime('Server closed');
        process.exit(0);
    });
});

// ============================================
// Unhandled Errors
// ============================================
process.on('uncaughtException', (err) => {
    log.error('Uncaught exception', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    log.error('Unhandled rejection', { reason, promise });
});

module.exports = app;
