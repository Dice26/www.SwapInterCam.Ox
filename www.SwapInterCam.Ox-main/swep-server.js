/**
 * SWEP (SwapInterCam Web Enhancement Protocol) Server
 * Backend API server for SwapInterCam system integration
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

class SwepServer {
    constructor() {
        this.app = express();
        this.PORT = process.env.SWEP_PORT || 8000;
        this.HOST = process.env.SWEP_HOST || '127.0.0.1';
        this.server = null;
        this.startTime = Date.now();
        this.requestCount = 0;
        this.errorCount = 0;
        this.cameraCache = null;
        this.lastCameraScan = null;
        
        this.initialize();
    }

    initialize() {
        console.log('🚀 Initializing SWEP Server...');
        
        // Setup middleware
        this.setupMiddleware();
        
        // Setup routes
        this.setupRoutes();
        
        // Setup error handling
        this.setupErrorHandling();
        
        console.log('✅ SWEP Server initialized');
    }

    setupMiddleware() {
        // Enable CORS for cross-origin requests
        this.app.use(cors({
            origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'file://'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        }));
        
        // Parse JSON bodies
        this.app.use(express.json({ limit: '10mb' }));
        
        // Parse URL-encoded bodies
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        // Request logging middleware
        this.app.use((req, res, next) => {
            this.requestCount++;
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
            
            // Add request ID for tracking
            req.requestId = Math.random().toString(36).substr(2, 9);
            res.setHeader('X-Request-ID', req.requestId);
            
            next();
        });
        
        // Security headers
        this.app.use((req, res, next) => {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            next();
        });
    }

    setupRoutes() {
        console.log('🛣️ Setting up SWEP API routes...');
        
        // Health check endpoint (fixed)
        this.app.get('/api/health', (req, res) => {
            try {
                const uptime = Date.now() - this.startTime;
                const healthData = {
                    status: 'ok',
                    timestamp: new Date().toISOString(),
                    uptime: uptime,
                    uptimeFormatted: this.formatUptime(uptime),
                    version: '1.0.0',
                    requests: this.requestCount,
                    errors: this.errorCount,
                    memory: process.memoryUsage(),
                    pid: process.pid
                };
                
                res.json(healthData);
            } catch (error) {
                this.handleError(res, error, 'Health check failed');
            }
        });

        // Enhanced camera scan endpoint
        this.app.get('/api/cameras', async (req, res) => {
            try {
                console.log('📹 Camera scan requested');
                
                const cameraData = await this.scanCameras();
                
                res.json({
                    success: true,
                    timestamp: new Date().toISOString(),
                    lastScan: this.lastCameraScan,
                    ...cameraData
                });
                
            } catch (error) {
                this.handleError(res, error, 'Camera scan failed');
            }
        });

        // Camera permissions endpoint
        this.app.get('/api/cameras/permissions', (req, res) => {
            try {
                // In a real implementation, this would check system-level camera permissions
                const permissionData = {
                    success: true,
                    permissions: {
                        camera: 'granted', // This would be dynamically checked
                        microphone: 'granted'
                    },
                    systemPermissions: {
                        windows: this.checkWindowsCameraPermissions(),
                        browser: 'unknown' // Would be checked client-side
                    },
                    timestamp: new Date().toISOString()
                };
                
                res.json(permissionData);
            } catch (error) {
                this.handleError(res, error, 'Permission check failed');
            }
        });

        // OBS integration endpoint
        this.app.get('/api/obs/status', (req, res) => {
            try {
                const obsData = {
                    success: true,
                    connected: false, // Would check actual OBS connection
                    version: null,
                    scenes: [],
                    virtualCamera: {
                        available: this.checkOBSVirtualCamera(),
                        active: false
                    },
                    timestamp: new Date().toISOString()
                };
                
                res.json(obsData);
            } catch (error) {
                this.handleError(res, error, 'OBS status check failed');
            }
        });

        // System information endpoint
        this.app.get('/api/system', (req, res) => {
            try {
                const systemData = {
                    success: true,
                    platform: process.platform,
                    arch: process.arch,
                    nodeVersion: process.version,
                    memory: process.memoryUsage(),
                    uptime: process.uptime(),
                    cpuUsage: process.cpuUsage(),
                    timestamp: new Date().toISOString()
                };
                
                res.json(systemData);
            } catch (error) {
                this.handleError(res, error, 'System info failed');
            }
        });

        // SwapInterCam status endpoint
        this.app.get('/api/swapintercam/status', (req, res) => {
            try {
                const statusData = {
                    success: true,
                    components: {
                        webviewManager: true, // Would check actual status
                        cameraSystem: true,
                        permissionHandler: true,
                        streamController: true,
                        persistenceOverride: true,
                        autosaveSystem: true
                    },
                    health: {
                        overall: 'healthy',
                        issues: []
                    },
                    timestamp: new Date().toISOString()
                };
                
                res.json(statusData);
            } catch (error) {
                this.handleError(res, error, 'SwapInterCam status check failed');
            }
        });

        // Configuration endpoint
        this.app.get('/api/config', (req, res) => {
            try {
                const config = {
                    success: true,
                    server: {
                        port: this.PORT,
                        host: this.HOST,
                        version: '1.0.0'
                    },
                    features: {
                        cameraScanning: true,
                        obsIntegration: true,
                        permissionManagement: true,
                        systemMonitoring: true
                    },
                    timestamp: new Date().toISOString()
                };
                
                res.json(config);
            } catch (error) {
                this.handleError(res, error, 'Config retrieval failed');
            }
        });

        // Logs endpoint
        this.app.get('/api/logs', async (req, res) => {
            try {
                const logs = await this.getRecentLogs();
                
                res.json({
                    success: true,
                    logs: logs,
                    count: logs.length,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                this.handleError(res, error, 'Log retrieval failed');
            }
        });

        // Test endpoint for debugging
        this.app.get('/api/test', (req, res) => {
            res.json({
                success: true,
                message: 'SWEP Server test endpoint working',
                requestId: req.requestId,
                timestamp: new Date().toISOString()
            });
        });

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                name: 'SWEP Server',
                description: 'SwapInterCam Web Enhancement Protocol Server',
                version: '1.0.0',
                status: 'running',
                endpoints: [
                    '/api/health',
                    '/api/cameras',
                    '/api/cameras/permissions',
                    '/api/obs/status',
                    '/api/system',
                    '/api/swapintercam/status',
                    '/api/config',
                    '/api/logs',
                    '/api/test'
                ],
                timestamp: new Date().toISOString()
            });
        });

        console.log('✅ SWEP API routes configured');
    }

    setupErrorHandling() {
        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint not found',
                path: req.path,
                method: req.method,
                timestamp: new Date().toISOString()
            });
        });

        // Global error handler
        this.app.use((error, req, res, next) => {
            this.errorCount++;
            console.error('🚨 SWEP Server Error:', error);
            
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                requestId: req.requestId,
                timestamp: new Date().toISOString()
            });
        });
    }

    async scanCameras() {
        console.log('🔍 Scanning for cameras...');
        
        // Check cache first (cache for 30 seconds)
        if (this.cameraCache && this.lastCameraScan && 
            (Date.now() - this.lastCameraScan) < 30000) {
            console.log('📋 Using cached camera data');
            return this.cameraCache;
        }
        
        try {
            // Simulate camera detection (in real implementation, this would use system APIs)
            const systemCameras = await this.detectSystemCameras();
            const obsCamera = this.checkOBSVirtualCamera();
            
            const cameraData = {
                totalCameras: systemCameras.length + (obsCamera ? 1 : 0),
                systemCameras: systemCameras,
                obsVirtualCamera: obsCamera ? {
                    name: 'OBS Virtual Camera',
                    available: true,
                    active: false // Would check if actually streaming
                } : null,
                scanTime: Date.now(),
                details: {
                    platform: process.platform,
                    scanMethod: 'system-api-simulation'
                }
            };
            
            // Cache the results
            this.cameraCache = cameraData;
            this.lastCameraScan = Date.now();
            
            console.log(`✅ Camera scan completed: ${cameraData.totalCameras} cameras found`);
            return cameraData;
            
        } catch (error) {
            console.error('❌ Camera scan failed:', error);
            throw error;
        }
    }

    async detectSystemCameras() {
        // Simulate system camera detection
        // In a real implementation, this would use platform-specific APIs
        const simulatedCameras = [
            {
                id: 'camera-1',
                name: 'Integrated Camera',
                type: 'built-in',
                resolution: '1920x1080',
                status: 'available'
            }
        ];
        
        // Check if external cameras might be connected
        if (Math.random() > 0.5) {
            simulatedCameras.push({
                id: 'camera-2',
                name: 'USB Camera',
                type: 'external',
                resolution: '1280x720',
                status: 'available'
            });
        }
        
        return simulatedCameras;
    }

    checkOBSVirtualCamera() {
        // In a real implementation, this would check if OBS Virtual Camera is installed
        // For now, we'll simulate it
        return Math.random() > 0.3; // 70% chance OBS is available
    }

    checkWindowsCameraPermissions() {
        // In a real implementation, this would check Windows camera privacy settings
        return {
            systemLevel: 'allowed',
            appLevel: 'allowed',
            lastChecked: new Date().toISOString()
        };
    }

    async getRecentLogs() {
        // In a real implementation, this would read from actual log files
        const simulatedLogs = [
            {
                timestamp: new Date(Date.now() - 60000).toISOString(),
                level: 'info',
                message: 'SWEP Server started successfully'
            },
            {
                timestamp: new Date(Date.now() - 30000).toISOString(),
                level: 'info',
                message: 'Camera scan completed'
            },
            {
                timestamp: new Date().toISOString(),
                level: 'info',
                message: 'Log retrieval requested'
            }
        ];
        
        return simulatedLogs;
    }

    handleError(res, error, message) {
        this.errorCount++;
        console.error(`❌ ${message}:`, error);
        
        res.status(500).json({
            success: false,
            error: message,
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }

    formatUptime(uptime) {
        const seconds = Math.floor(uptime / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    start() {
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(this.PORT, this.HOST, () => {
                    console.log(`🚀 SWEP Server running at http://${this.HOST}:${this.PORT}`);
                    console.log(`📊 Health check: http://${this.HOST}:${this.PORT}/api/health`);
                    console.log(`📹 Camera API: http://${this.HOST}:${this.PORT}/api/cameras`);
                    resolve(this.server);
                });
                
                this.server.on('error', (error) => {
                    console.error('❌ SWEP Server error:', error);
                    reject(error);
                });
                
            } catch (error) {
                console.error('❌ Failed to start SWEP Server:', error);
                reject(error);
            }
        });
    }

    stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('⏹️ SWEP Server stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    getStatus() {
        return {
            running: !!this.server,
            uptime: Date.now() - this.startTime,
            requests: this.requestCount,
            errors: this.errorCount,
            port: this.PORT,
            host: this.HOST
        };
    }
}

// Auto-start if run directly
if (require.main === module) {
    const swepServer = new SwepServer();
    
    swepServer.start().then(() => {
        console.log('✅ SWEP Server started successfully');
    }).catch((error) => {
        console.error('❌ Failed to start SWEP Server:', error);
        process.exit(1);
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down SWEP Server...');
        await swepServer.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log('\n🛑 Shutting down SWEP Server...');
        await swepServer.stop();
        process.exit(0);
    });
}

module.exports = SwepServer;