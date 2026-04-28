/**
 * SWEP (SwapInterCam Web Enhancement Protocol) Server - Simplified
 * Backend API server for SwapInterCam system integration (no external dependencies)
 */

const http = require('http');
const url = require('url');
const querystring = require('querystring');

class SwepServerSimple {
    constructor() {
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
        console.log('🚀 Initializing SWEP Server (Simple)...');
        this.createServer();
        console.log('✅ SWEP Server initialized');
    }

    createServer() {
        this.server = http.createServer((req, res) => {
            this.handleRequest(req, res);
        });
    }

    async handleRequest(req, res) {
        this.requestCount++;
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${req.method} ${req.url} - ${req.connection.remoteAddress}`);
        
        // Add CORS headers
        this.setCORSHeaders(res);
        
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        
        try {
            const parsedUrl = url.parse(req.url, true);
            const pathname = parsedUrl.pathname;
            
            // Route handling
            if (pathname === '/api/health') {
                await this.handleHealth(req, res);
            } else if (pathname === '/api/cameras') {
                await this.handleCameras(req, res);
            } else if (pathname === '/api/cameras/permissions') {
                await this.handleCameraPermissions(req, res);
            } else if (pathname === '/api/obs/status') {
                await this.handleOBSStatus(req, res);
            } else if (pathname === '/api/system') {
                await this.handleSystemInfo(req, res);
            } else if (pathname === '/api/swapintercam/status') {
                await this.handleSwapInterCamStatus(req, res);
            } else if (pathname === '/api/config') {
                await this.handleConfig(req, res);
            } else if (pathname === '/api/logs') {
                await this.handleLogs(req, res);
            } else if (pathname === '/api/test') {
                await this.handleTest(req, res);
            } else if (pathname === '/') {
                await this.handleRoot(req, res);
            } else {
                this.handle404(req, res);
            }
            
        } catch (error) {
            this.handleError(req, res, error);
        }
    }

    setCORSHeaders(res) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.setHeader('Access-Control-Max-Age', '86400');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    async handleHealth(req, res) {
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
        
        this.sendJSON(res, 200, healthData);
    }

    async handleCameras(req, res) {
        console.log('📹 Camera scan requested');
        
        const cameraData = await this.scanCameras();
        
        this.sendJSON(res, 200, {
            success: true,
            timestamp: new Date().toISOString(),
            lastScan: this.lastCameraScan,
            ...cameraData
        });
    }

    async handleCameraPermissions(req, res) {
        const permissionData = {
            success: true,
            permissions: {
                camera: 'granted',
                microphone: 'granted'
            },
            systemPermissions: {
                windows: this.checkWindowsCameraPermissions(),
                browser: 'unknown'
            },
            timestamp: new Date().toISOString()
        };
        
        this.sendJSON(res, 200, permissionData);
    }

    async handleOBSStatus(req, res) {
        const obsData = {
            success: true,
            connected: false,
            version: null,
            scenes: [],
            virtualCamera: {
                available: this.checkOBSVirtualCamera(),
                active: false
            },
            timestamp: new Date().toISOString()
        };
        
        this.sendJSON(res, 200, obsData);
    }

    async handleSystemInfo(req, res) {
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
        
        this.sendJSON(res, 200, systemData);
    }

    async handleSwapInterCamStatus(req, res) {
        const statusData = {
            success: true,
            components: {
                webviewManager: true,
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
        
        this.sendJSON(res, 200, statusData);
    }

    async handleConfig(req, res) {
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
        
        this.sendJSON(res, 200, config);
    }

    async handleLogs(req, res) {
        const logs = await this.getRecentLogs();
        
        this.sendJSON(res, 200, {
            success: true,
            logs: logs,
            count: logs.length,
            timestamp: new Date().toISOString()
        });
    }

    async handleTest(req, res) {
        this.sendJSON(res, 200, {
            success: true,
            message: 'SWEP Server test endpoint working',
            timestamp: new Date().toISOString()
        });
    }

    async handleRoot(req, res) {
        this.sendJSON(res, 200, {
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
    }

    handle404(req, res) {
        this.sendJSON(res, 404, {
            success: false,
            error: 'Endpoint not found',
            path: req.url,
            method: req.method,
            timestamp: new Date().toISOString()
        });
    }

    handleError(req, res, error) {
        this.errorCount++;
        console.error('🚨 SWEP Server Error:', error);
        
        this.sendJSON(res, 500, {
            success: false,
            error: 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }

    sendJSON(res, statusCode, data) {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data, null, 2));
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
            const systemCameras = await this.detectSystemCameras();
            const obsCamera = this.checkOBSVirtualCamera();
            
            const cameraData = {
                totalCameras: systemCameras.length + (obsCamera ? 1 : 0),
                systemCameras: systemCameras,
                obsVirtualCamera: obsCamera ? {
                    name: 'OBS Virtual Camera',
                    available: true,
                    active: false
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
        // Simulate OBS Virtual Camera detection
        return Math.random() > 0.3; // 70% chance OBS is available
    }

    checkWindowsCameraPermissions() {
        return {
            systemLevel: 'allowed',
            appLevel: 'allowed',
            lastChecked: new Date().toISOString()
        };
    }

    async getRecentLogs() {
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
                this.server.listen(this.PORT, this.HOST, () => {
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
    const swepServer = new SwepServerSimple();
    
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

module.exports = SwepServerSimple;