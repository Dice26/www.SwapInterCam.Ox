/**
 * Backend-Centric Architecture - Core Backend Service
 * Single Source of Truth for SwapInterCam System
 */

const http = require('http');
const WebSocket = require('ws');
const url = require('url');
const fs = require('fs').promises;
const path = require('path');
const StateManager = require('./state-manager');
const CameraRecoveryModule = require('./modules/camera-recovery');
const WindowRecoveryModule = require('./modules/window-recovery');
const OBSRecoveryModule = require('./modules/obs-recovery');
const ActionExecutor = require('./action-executor');
const IssueDetector = require('./issue-detector');
const LoggingSystem = require('./logging-system');
const MonitoringDashboard = require('./monitoring-dashboard');
const StateManagerPersistenceIntegration = require('./state-manager-persistence-integration');

class BackendService {
    constructor() {
        this.PORT = process.env.BACKEND_PORT || 8001;
        this.HOST = process.env.BACKEND_HOST || '127.0.0.1';
        this.server = null;
        this.wsServer = null;
        this.clients = new Set();
        
        // Enhanced state management
        this.stateManager = new StateManager(path.join(__dirname, 'state.json'));
        this.logFile = path.join(__dirname, 'backend.log');
        
        // Initialize recovery modules
        this.recoveryModules = new Map();
        this.initializeRecoveryModules();
        
        // Initialize action executor
        this.actionExecutor = new ActionExecutor(this.stateManager, this.recoveryModules);
        
        // Initialize issue detector
        this.issueDetector = new IssueDetector(this.stateManager, this.actionExecutor);
        
        // Initialize logging system
        this.loggingSystem = new LoggingSystem({
            logDirectory: path.join(__dirname, 'logs'),
            logLevel: process.env.LOG_LEVEL || 'info',
            enableMetrics: true
        });
        
        // Initialize monitoring dashboard
        this.monitoringDashboard = new MonitoringDashboard(this.loggingSystem, this.stateManager);
        
        // Create logger interface for persistence system
        const logger = {
            info: (msg, data) => this.loggingSystem.log('info', msg, data),
            warn: (msg, data) => this.loggingSystem.log('warn', msg, data),
            error: (msg, data) => this.loggingSystem.log('error', msg, data),
            debug: (msg, data) => this.loggingSystem.log('debug', msg, data),
            performance: (component, value, data) => this.loggingSystem.performance('persistence', component, value, data)
        };

        // Initialize state persistence integration
        this.statePersistence = new StateManagerPersistenceIntegration(
            this.stateManager, 
            logger, 
            {
                persistenceDir: path.join(__dirname, 'persistence'),
                autoSaveInterval: 30000, // 30 seconds
                enableAutoSave: true,
                enableCrashRecovery: true,
                maxBackups: 10
            }
        );
        
        // Setup state change listeners
        this.setupStateListeners();
        
        console.log('🚀 Initializing Backend Service (Single Source of Truth)...');
    }

    initializeRecoveryModules() {
        // Initialize camera recovery module
        const cameraRecovery = new CameraRecoveryModule(this.stateManager);
        this.recoveryModules.set('camera', cameraRecovery);
        
        // Initialize window recovery module
        const windowRecovery = new WindowRecoveryModule(this.stateManager);
        this.recoveryModules.set('window', windowRecovery);
        
        // Initialize OBS recovery module
        const obsRecovery = new OBSRecoveryModule(this.stateManager);
        this.recoveryModules.set('obs', obsRecovery);
        
        console.log(`🔧 Initialized ${this.recoveryModules.size} recovery modules`);
    }

    setupStateListeners() {
        // Listen for state changes and broadcast to clients
        this.stateManager.onStateChange((event) => {
            this.broadcastStateUpdate(event.newState, event.changes);
        });
        
        // Listen for component-specific changes
        ['cameras', 'obs', 'windows', 'recovery'].forEach(component => {
            this.stateManager.onComponentChange(component, (event) => {
                console.log(`📊 ${component} state changed:`, 
                    event.changes.map(c => c.path).join(', '));
            });
        });
        
        // Listen for state restoration
        this.stateManager.on('state-restored', (event) => {
            console.log(`📂 State restored from ${event.savedAt || 'previous session'}`);
            this.broadcastStateUpdate(this.stateManager.getState());
        });
    }

    async start() {
        try {
            // Initialize state persistence first
            await this.statePersistence.initialize();
            
            // Restore previous state if exists (now handled by persistence system)
            // await this.stateManager.restoreState(); // Commented out - handled by persistence
            
            // Create HTTP server
            this.server = http.createServer((req, res) => {
                this.handleRequest(req, res);
            });
            
            // Create WebSocket server for real-time updates
            this.wsServer = new WebSocket.Server({ server: this.server });
            this.setupWebSocket();
            
            // Start server
            await new Promise((resolve, reject) => {
                this.server.listen(this.PORT, this.HOST, (error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });
            
            console.log(`✅ Backend Service running at http://${this.HOST}:${this.PORT}`);
            console.log(`📡 WebSocket server ready for real-time updates`);
            console.log(`📊 State API: http://${this.HOST}:${this.PORT}/api/state`);
            console.log(`⚡ Actions API: http://${this.HOST}:${this.PORT}/api/actions/*`);
            console.log(`📈 Statistics API: http://${this.HOST}:${this.PORT}/api/statistics`);
            
            // Start recovery module monitoring
            this.startRecoveryMonitoring();
            
            // Initialize logging system
            await this.loggingSystem.initialize();
            
            // Start issue detection monitoring
            this.issueDetector.startMonitoring();
            
            // Start monitoring and state updates
            this.startMonitoring();
            
            return this.server;
            
        } catch (error) {
            console.error('❌ Failed to start Backend Service:', error);
            throw error;
        }
    }

    async stop() {
        console.log('🛑 Stopping Backend Service...');
        
        // Perform graceful shutdown with state persistence
        if (this.statePersistence) {
            await this.statePersistence.gracefulShutdown();
        } else {
            // Fallback to old method if persistence not available
            await this.stateManager.persistState();
        }
        
        // Stop issue detection
        if (this.issueDetector) {
            this.issueDetector.cleanup();
        }
        
        // Stop monitoring dashboard
        if (this.monitoringDashboard) {
            this.monitoringDashboard.cleanup();
        }
        
        // Stop logging system
        if (this.loggingSystem) {
            await this.loggingSystem.cleanup();
        }
        
        // Cleanup state persistence
        if (this.statePersistence) {
            await this.statePersistence.cleanup();
        }
        
        // Close WebSocket connections
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.close();
            }
        });
        
        // Close servers
        if (this.wsServer) {
            this.wsServer.close();
        }
        
        if (this.server) {
            await new Promise(resolve => {
                this.server.close(resolve);
            });
        }
        
        console.log('✅ Backend Service stopped');
    }

    setupWebSocket() {
        this.wsServer.on('connection', (ws) => {
            console.log('📡 New WebSocket client connected');
            this.clients.add(ws);
            
            // Send current state to new client
            this.sendToClient(ws, {
                type: 'state-update',
                data: this.stateManager.getState(),
                statistics: this.stateManager.getStatistics()
            });
            
            ws.on('close', () => {
                console.log('📡 WebSocket client disconnected');
                this.clients.delete(ws);
            });
            
            ws.on('error', (error) => {
                console.error('📡 WebSocket error:', error);
                this.clients.delete(ws);
            });
        });
    }

    async handleRequest(req, res) {
        const startTime = Date.now();
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${req.method} ${req.url}`);
        
        // Set CORS headers
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
            if (pathname === '/api/state') {
                await this.handleGetState(req, res);
            } else if (pathname.startsWith('/api/actions/')) {
                await this.handleAction(req, res, pathname);
            } else if (pathname === '/api/actions') {
                await this.handleActionsList(req, res);
            } else if (pathname === '/api/actions/history') {
                await this.handleActionsHistory(req, res);
            } else if (pathname === '/api/actions/statistics') {
                await this.handleActionsStatistics(req, res);
            } else if (pathname === '/api/issues') {
                await this.handleIssues(req, res);
            } else if (pathname === '/api/issues/history') {
                await this.handleIssuesHistory(req, res);
            } else if (pathname === '/api/issues/statistics') {
                await this.handleIssuesStatistics(req, res);
            } else if (pathname.startsWith('/api/issues/') && pathname.includes('/actions/')) {
                await this.handleIssueAction(req, res, pathname);
            } else if (pathname === '/api/detection-rules') {
                await this.handleDetectionRules(req, res);
            } else if (pathname === '/api/monitoring/dashboard') {
                await this.handleMonitoringDashboard(req, res);
            } else if (pathname === '/api/monitoring/alerts') {
                await this.handleMonitoringAlerts(req, res);
            } else if (pathname === '/api/monitoring/metrics') {
                await this.handleMonitoringMetrics(req, res);
            } else if (pathname === '/api/monitoring/logs') {
                await this.handleMonitoringLogs(req, res);
            } else if (pathname === '/api/monitoring/report') {
                await this.handleMonitoringReport(req, res);
            } else if (pathname === '/api/statistics') {
                await this.handleStatistics(req, res);
            } else if (pathname === '/api/history') {
                await this.handleHistory(req, res);
            } else if (pathname === '/api/recovery/status') {
                await this.handleRecoveryStatus(req, res);
            } else if (pathname === '/api/health') {
                await this.handleHealth(req, res);
            } else if (pathname === '/api/persistence/save') {
                await this.handlePersistenceSave(req, res);
            } else if (pathname === '/api/persistence/restore') {
                await this.handlePersistenceRestore(req, res);
            } else if (pathname === '/api/persistence/stats') {
                await this.handlePersistenceStats(req, res);
            } else if (pathname === '/api/persistence/backups') {
                await this.handlePersistenceBackups(req, res);
            } else if (pathname.startsWith('/api/persistence/backups/')) {
                await this.handlePersistenceBackupAction(req, res, pathname);
            } else if (pathname === '/api/persistence/configuration') {
                await this.handlePersistenceConfiguration(req, res);
            } else if (pathname === '/api/persistence/health') {
                await this.handlePersistenceHealth(req, res);
            } else if (pathname === '/') {
                await this.handleRoot(req, res);
            } else {
                this.handle404(req, res);
            }
            
        } catch (error) {
            this.handleError(req, res, error);
        } finally {
            // Log request completion
            const duration = Date.now() - startTime;
            if (this.loggingSystem) {
                this.loggingSystem.request(req.method, req.url, res.statusCode || 500, duration, {
                    userAgent: req.headers['user-agent'],
                    clientIP: req.connection.remoteAddress
                });
            }
        }
    }

    setCORSHeaders(res) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.setHeader('Access-Control-Max-Age', '86400');
        res.setHeader('Content-Type', 'application/json');
    }

    async handleGetState(req, res) {
        // Return current system state (single source of truth)
        const state = this.stateManager.getState();
        const statistics = this.stateManager.getStatistics();
        
        this.sendJSON(res, 200, {
            success: true,
            state: state,
            statistics: statistics,
            timestamp: Date.now()
        });
    }

    async handleStatistics(req, res) {
        const statistics = this.stateManager.getStatistics();
        const validation = this.stateManager.validateState();
        
        this.sendJSON(res, 200, {
            success: true,
            statistics: statistics,
            validation: validation,
            timestamp: Date.now()
        });
    }

    async handleHistory(req, res) {
        const url_parts = url.parse(req.url, true);
        const limit = parseInt(url_parts.query.limit) || 20;
        
        const history = this.stateManager.getChangeHistory(limit);
        
        this.sendJSON(res, 200, {
            success: true,
            history: history,
            count: history.length,
            timestamp: Date.now()
        });
    }

    async handleRecoveryStatus(req, res) {
        const recoveryStatus = {};
        
        this.recoveryModules.forEach((module, name) => {
            recoveryStatus[name] = module.getStatus();
        });
        
        this.sendJSON(res, 200, {
            success: true,
            modules: recoveryStatus,
            totalModules: this.recoveryModules.size,
            timestamp: Date.now()
        });
    }

    async handleAction(req, res, pathname) {
        const action = pathname.replace('/api/actions/', '');
        
        console.log(`⚡ Executing action: ${action}`);
        
        // Parse request body if present
        let params = {};
        if (req.method === 'POST') {
            params = await this.parseRequestBody(req);
        }
        
        // Create execution context
        const context = {
            requestId: Math.random().toString(36).substr(2, 9),
            clientIP: req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            timestamp: Date.now()
        };
        
        // Execute action using ActionExecutor
        const result = await this.actionExecutor.executeAction(action, params, context);
        
        // Send result to client
        this.sendJSON(res, result.success ? 200 : 400, result);
    }

    async handleActionsList(req, res) {
        // Return list of available actions
        const actions = this.actionExecutor.getAvailableActions();
        
        this.sendJSON(res, 200, {
            success: true,
            actions: actions,
            count: Object.keys(actions).length,
            timestamp: Date.now()
        });
    }

    async handleActionsHistory(req, res) {
        // Return action execution history
        const url_parts = url.parse(req.url, true);
        const limit = parseInt(url_parts.query.limit) || 50;
        
        const history = this.actionExecutor.getActionHistory(limit);
        
        this.sendJSON(res, 200, {
            success: true,
            history: history,
            count: history.length,
            timestamp: Date.now()
        });
    }

    async handleActionsStatistics(req, res) {
        // Return action execution statistics
        const statistics = this.actionExecutor.getActionStatistics();
        
        this.sendJSON(res, 200, {
            success: true,
            statistics: statistics,
            timestamp: Date.now()
        });
    }

    async handleIssues(req, res) {
        // Return current detected issues
        const issues = this.issueDetector.getCurrentIssues();
        
        this.sendJSON(res, 200, {
            success: true,
            issues: issues,
            count: issues.length,
            timestamp: Date.now()
        });
    }

    async handleIssuesHistory(req, res) {
        // Return issue detection history
        const url_parts = url.parse(req.url, true);
        const limit = parseInt(url_parts.query.limit) || 50;
        
        const history = this.issueDetector.getIssueHistory(limit);
        
        this.sendJSON(res, 200, {
            success: true,
            history: history,
            count: history.length,
            timestamp: Date.now()
        });
    }

    async handleIssuesStatistics(req, res) {
        // Return issue detection statistics
        const statistics = this.issueDetector.getIssueStatistics();
        
        this.sendJSON(res, 200, {
            success: true,
            statistics: statistics,
            timestamp: Date.now()
        });
    }

    async handleIssueAction(req, res, pathname) {
        // Handle issue action execution: /api/issues/{issueId}/actions/{actionId}
        const pathParts = pathname.split('/');
        const issueId = pathParts[3];
        const actionId = pathParts[5];
        
        if (!issueId || !actionId) {
            this.sendJSON(res, 400, {
                success: false,
                message: 'Invalid issue action URL format',
                details: 'Expected format: /api/issues/{issueId}/actions/{actionId}'
            });
            return;
        }

        console.log(`🔧 Executing action ${actionId} for issue ${issueId}`);
        
        try {
            const result = await this.issueDetector.executeIssueAction(issueId, actionId);
            this.sendJSON(res, result.success ? 200 : 400, result);
        } catch (error) {
            console.error(`❌ Issue action execution failed:`, error);
            this.sendJSON(res, 500, {
                success: false,
                message: 'Issue action execution failed',
                details: error.message
            });
        }
    }

    async handleDetectionRules(req, res) {
        // Return available detection rules
        const rules = this.issueDetector.getDetectionRules();
        
        this.sendJSON(res, 200, {
            success: true,
            rules: rules,
            count: Object.keys(rules).length,
            timestamp: Date.now()
        });
    }

    async handleMonitoringDashboard(req, res) {
        // Return comprehensive monitoring dashboard data
        const dashboardData = this.monitoringDashboard.getDashboardData();
        
        this.sendJSON(res, 200, {
            success: true,
            dashboard: dashboardData,
            timestamp: Date.now()
        });
    }

    async handleMonitoringAlerts(req, res) {
        // Return active alerts and alert history
        const activeAlerts = this.monitoringDashboard.getActiveAlerts();
        const alertHistory = this.monitoringDashboard.getAlertHistory(50);
        
        this.sendJSON(res, 200, {
            success: true,
            activeAlerts: activeAlerts,
            alertHistory: alertHistory,
            count: activeAlerts.length,
            timestamp: Date.now()
        });
    }

    async handleMonitoringMetrics(req, res) {
        // Return detailed performance metrics
        const metrics = this.loggingSystem.getMetrics();
        const performanceHistory = this.loggingSystem.getPerformanceHistory(60);
        
        this.sendJSON(res, 200, {
            success: true,
            metrics: metrics,
            performanceHistory: performanceHistory,
            timestamp: Date.now()
        });
    }

    async handleMonitoringLogs(req, res) {
        // Return recent logs
        const url_parts = url.parse(req.url, true);
        const logType = url_parts.query.type || 'main';
        const limit = parseInt(url_parts.query.limit) || 100;
        
        try {
            const logs = await this.loggingSystem.getRecentLogs(logType, limit);
            
            this.sendJSON(res, 200, {
                success: true,
                logs: logs,
                logType: logType,
                count: logs.length,
                timestamp: Date.now()
            });
        } catch (error) {
            this.sendJSON(res, 500, {
                success: false,
                message: 'Failed to retrieve logs',
                error: error.message
            });
        }
    }

    async handleMonitoringReport(req, res) {
        // Generate comprehensive monitoring report
        try {
            const report = await this.monitoringDashboard.generateReport();
            
            this.sendJSON(res, 200, {
                success: true,
                report: report,
                timestamp: Date.now()
            });
        } catch (error) {
            this.sendJSON(res, 500, {
                success: false,
                message: 'Failed to generate monitoring report',
                error: error.message
            });
        }
    }



    broadcastStateUpdate(state = null, changes = null) {
        const currentState = state || this.stateManager.getState();
        const statistics = this.stateManager.getStatistics();
        
        const message = {
            type: 'state-update',
            data: currentState,
            statistics: statistics,
            changes: changes,
            timestamp: Date.now()
        };
        
        this.clients.forEach(client => {
            this.sendToClient(client, message);
        });
        
        console.log(`📡 Broadcasted state update to ${this.clients.size} clients`);
    }

    sendToClient(client, message) {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(JSON.stringify(message));
            } catch (error) {
                console.error('📡 Failed to send message to client:', error);
                this.clients.delete(client);
            }
        }
    }

    startMonitoring() {
        // Monitor system state every 5 seconds
        setInterval(() => {
            this.performHealthCheck();
        }, 5000);
        
        console.log('👁️ System monitoring started');
    }

    startRecoveryMonitoring() {
        // Start monitoring for each recovery module
        this.recoveryModules.forEach((module, name) => {
            if (typeof module.startMonitoring === 'function') {
                module.startMonitoring();
                console.log(`👁️ Started monitoring for ${name} recovery module`);
            }
        });
    }

    performHealthCheck() {
        // Simulate health checks and issue detection
        const now = Date.now();
        const currentState = this.stateManager.getState();
        
        // Example: Detect if camera hasn't been active for too long
        if (currentState.cameras.activeStreams === 0 && 
            now - currentState.lastUpdate > 30000) {
            
            const existingIssue = currentState.cameras.issues.find(i => 
                i.message === 'No active camera streams'
            );
            
            if (!existingIssue) {
                this.stateManager.addIssue('cameras', 'No active camera streams', 'warning');
            }
        }
        
        // Check OBS connection timeout
        if (currentState.obs.connected && currentState.obs.lastConnection && 
            now - currentState.obs.lastConnection > 60000) {
            
            const existingIssue = currentState.obs.issues.find(i => 
                i.message === 'OBS connection timeout'
            );
            
            if (!existingIssue) {
                this.stateManager.addIssue('obs', 'OBS connection timeout', 'warning');
            }
        }
    }





    async parseRequestBody(req) {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    resolve(body ? JSON.parse(body) : {});
                } catch (error) {
                    resolve({});
                }
            });
            req.on('error', reject);
        });
    }

    async handleHealth(req, res) {
        const statistics = this.stateManager.getStatistics();
        const validation = this.stateManager.validateState();
        
        this.sendJSON(res, 200, {
            status: 'ok',
            health: this.stateManager.getState().health,
            uptime: statistics.uptime,
            uptimeFormatted: statistics.uptimeFormatted,
            clients: this.clients.size,
            totalChanges: statistics.totalChanges,
            currentIssues: statistics.currentIssues,
            validation: validation,
            timestamp: new Date().toISOString()
        });
    }

    async handleRoot(req, res) {
        this.sendJSON(res, 200, {
            name: 'SwapInterCam Backend Service',
            description: 'Single Source of Truth for SwapInterCam System',
            version: '1.0.0',
            status: 'running',
            endpoints: [
                'GET /api/state - Get current system state',
                'GET /api/statistics - Get system statistics',
                'GET /api/history - Get change history',
                'GET /api/health - Get health status',
                'POST /api/actions/fix-camera - Fix camera issues',
                'POST /api/actions/show-window - Show main window',
                'POST /api/actions/reconnect-obs - Reconnect OBS',
                'POST /api/actions/scan-cameras - Scan for cameras',
                'POST /api/actions/restart-system - Restart system',
                'POST /api/actions/test-recovery - Test recovery system',
                'POST /api/actions/auto-recover - Automatic recovery',
                'GET /api/recovery/status - Recovery module status',
                'WebSocket /ws - Real-time state updates'
            ],
            timestamp: new Date().toISOString()
        });
    }

    handle404(req, res) {
        this.sendJSON(res, 404, {
            success: false,
            error: 'Endpoint not found',
            path: req.url,
            method: req.method
        });
    }

    handleError(req, res, error) {
        console.error('🚨 Request error:', error);
        
        this.sendJSON(res, 500, {
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }

    sendJSON(res, statusCode, data) {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data, null, 2));
    }
}

// Auto-start if run directly
if (require.main === module) {
    const backendService = new BackendService();
    
    backendService.start().then(() => {
        console.log('✅ Backend Service started successfully');
    }).catch((error) => {
        console.error('❌ Failed to start Backend Service:', error);
        process.exit(1);
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down Backend Service...');
        await backendService.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log('\n🛑 Shutting down Backend Service...');
        await backendService.stop();
        process.exit(0);
    });
}

module.exports = BackendService;