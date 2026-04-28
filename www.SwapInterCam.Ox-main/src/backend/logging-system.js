/**
 * Comprehensive Logging and Monitoring System
 * Provides structured logging, log rotation, performance metrics, and diagnostics
 */

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class LoggingSystem extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // Configuration
        this.config = {
            logDirectory: options.logDirectory || path.join(__dirname, 'logs'),
            maxLogSize: options.maxLogSize || 10 * 1024 * 1024, // 10MB
            maxLogFiles: options.maxLogFiles || 10,
            logLevel: options.logLevel || 'info',
            enableConsole: options.enableConsole !== false,
            enableFile: options.enableFile !== false,
            enableMetrics: options.enableMetrics !== false,
            metricsInterval: options.metricsInterval || 60000, // 1 minute
            ...options
        };
        
        // Log levels
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3,
            trace: 4
        };
        
        // Log files
        this.logFiles = {
            main: path.join(this.config.logDirectory, 'swapintercam.log'),
            error: path.join(this.config.logDirectory, 'error.log'),
            actions: path.join(this.config.logDirectory, 'actions.log'),
            recovery: path.join(this.config.logDirectory, 'recovery.log'),
            performance: path.join(this.config.logDirectory, 'performance.log'),
            audit: path.join(this.config.logDirectory, 'audit.log')
        };
        
        // Performance metrics
        this.metrics = {
            startTime: Date.now(),
            requests: { total: 0, successful: 0, failed: 0 },
            actions: { total: 0, successful: 0, failed: 0, avgDuration: 0 },
            recovery: { total: 0, successful: 0, failed: 0, avgDuration: 0 },
            websocket: { connections: 0, messages: 0, errors: 0 },
            system: { memory: 0, cpu: 0, uptime: 0 },
            errors: { total: 0, byType: {} },
            components: {
                cameras: { healthy: true, lastCheck: 0, issues: 0 },
                obs: { healthy: true, lastCheck: 0, issues: 0 },
                windows: { healthy: true, lastCheck: 0, issues: 0 }
            }
        };
        
        // Metrics collection
        this.metricsInterval = null;
        this.performanceHistory = [];
        this.maxHistorySize = 1440; // 24 hours at 1-minute intervals
        
        // Log buffers for batch writing
        this.logBuffers = new Map();
        this.flushInterval = null;
        this.flushFrequency = 5000; // 5 seconds
        
        console.log('📊 Logging System initializing...');
    }

    async initialize() {
        try {
            // Create log directory
            await this.ensureLogDirectory();
            
            // Initialize log files
            await this.initializeLogFiles();
            
            // Start metrics collection
            if (this.config.enableMetrics) {
                this.startMetricsCollection();
            }
            
            // Start log buffer flushing
            this.startLogBufferFlushing();
            
            // Log system startup
            this.info('Logging System initialized', {
                component: 'logging-system',
                config: {
                    logDirectory: this.config.logDirectory,
                    logLevel: this.config.logLevel,
                    enableMetrics: this.config.enableMetrics
                }
            });
            
            console.log('✅ Logging System initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Logging System:', error);
            throw error;
        }
    }

    async ensureLogDirectory() {
        try {
            await fs.mkdir(this.config.logDirectory, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    async initializeLogFiles() {
        // Create initial log files if they don't exist
        for (const [type, filePath] of Object.entries(this.logFiles)) {
            try {
                await fs.access(filePath);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    await fs.writeFile(filePath, '');
                }
            }
        }
    }

    // Core Logging Methods
    error(message, meta = {}) {
        this.log('error', message, meta);
        this.metrics.errors.total++;
        
        const errorType = meta.errorType || 'unknown';
        this.metrics.errors.byType[errorType] = (this.metrics.errors.byType[errorType] || 0) + 1;
    }

    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }

    info(message, meta = {}) {
        this.log('info', message, meta);
    }

    debug(message, meta = {}) {
        this.log('debug', message, meta);
    }

    trace(message, meta = {}) {
        this.log('trace', message, meta);
    }

    // Specialized Logging Methods
    action(actionName, result, duration, meta = {}) {
        const logEntry = {
            action: actionName,
            success: result.success,
            message: result.message,
            duration,
            executionId: result.executionId,
            ...meta
        };
        
        this.log('info', `Action executed: ${actionName}`, logEntry, 'actions');
        
        // Update metrics
        this.metrics.actions.total++;
        if (result.success) {
            this.metrics.actions.successful++;
        } else {
            this.metrics.actions.failed++;
        }
        
        // Update average duration
        this.updateAverageDuration('actions', duration);
    }

    recovery(operation, result, duration, meta = {}) {
        const logEntry = {
            operation,
            success: result.success,
            message: result.message,
            duration,
            recoveryId: result.recoveryId,
            ...meta
        };
        
        this.log('info', `Recovery operation: ${operation}`, logEntry, 'recovery');
        
        // Update metrics
        this.metrics.recovery.total++;
        if (result.success) {
            this.metrics.recovery.successful++;
        } else {
            this.metrics.recovery.failed++;
        }
        
        // Update average duration
        this.updateAverageDuration('recovery', duration);
    }

    request(method, url, statusCode, duration, meta = {}) {
        const logEntry = {
            method,
            url,
            statusCode,
            duration,
            userAgent: meta.userAgent,
            clientIP: meta.clientIP,
            ...meta
        };
        
        const level = statusCode >= 400 ? 'warn' : 'info';
        this.log(level, `${method} ${url} ${statusCode}`, logEntry);
        
        // Update metrics
        this.metrics.requests.total++;
        if (statusCode < 400) {
            this.metrics.requests.successful++;
        } else {
            this.metrics.requests.failed++;
        }
    }

    websocket(event, data = {}) {
        const logEntry = {
            event,
            connectionCount: data.connectionCount,
            messageType: data.messageType,
            ...data
        };
        
        this.log('debug', `WebSocket event: ${event}`, logEntry);
        
        // Update metrics
        if (event === 'connection') {
            this.metrics.websocket.connections++;
        } else if (event === 'message') {
            this.metrics.websocket.messages++;
        } else if (event === 'error') {
            this.metrics.websocket.errors++;
        }
    }

    audit(action, user, resource, result, meta = {}) {
        const logEntry = {
            action,
            user: user || 'system',
            resource,
            result,
            timestamp: new Date().toISOString(),
            sessionId: meta.sessionId,
            clientIP: meta.clientIP,
            ...meta
        };
        
        this.log('info', `Audit: ${action} on ${resource}`, logEntry, 'audit');
    }

    performance(component, metric, value, meta = {}) {
        const logEntry = {
            component,
            metric,
            value,
            unit: meta.unit || 'ms',
            threshold: meta.threshold,
            ...meta
        };
        
        this.log('debug', `Performance: ${component}.${metric} = ${value}`, logEntry, 'performance');
        
        // Check thresholds
        if (meta.threshold && value > meta.threshold) {
            this.warn(`Performance threshold exceeded: ${component}.${metric}`, {
                value,
                threshold: meta.threshold,
                component: 'performance-monitor'
            });
        }
    }

    // Core Log Method
    log(level, message, meta = {}, logType = 'main') {
        // Check log level
        if (this.levels[level] > this.levels[this.config.logLevel]) {
            return;
        }
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            message,
            pid: process.pid,
            component: meta.component || 'system',
            ...meta
        };
        
        // Console output
        if (this.config.enableConsole) {
            this.logToConsole(level, message, logEntry);
        }
        
        // File output
        if (this.config.enableFile) {
            this.logToFile(logEntry, logType);
        }
        
        // Emit log event
        this.emit('log', logEntry);
    }

    logToConsole(level, message, logEntry) {
        const timestamp = new Date().toLocaleTimeString();
        const component = logEntry.component ? `[${logEntry.component}]` : '';
        const prefix = `${timestamp} ${level.toUpperCase()} ${component}`;
        
        switch (level) {
            case 'error':
                console.error(`${prefix} ${message}`);
                break;
            case 'warn':
                console.warn(`${prefix} ${message}`);
                break;
            case 'debug':
            case 'trace':
                console.debug(`${prefix} ${message}`);
                break;
            default:
                console.log(`${prefix} ${message}`);
        }
    }

    logToFile(logEntry, logType) {
        const logFile = this.logFiles[logType] || this.logFiles.main;
        const logLine = JSON.stringify(logEntry) + '\n';
        
        // Add to buffer for batch writing
        if (!this.logBuffers.has(logFile)) {
            this.logBuffers.set(logFile, []);
        }
        
        this.logBuffers.get(logFile).push(logLine);
    }

    // Log Buffer Management
    startLogBufferFlushing() {
        this.flushInterval = setInterval(() => {
            this.flushLogBuffers();
        }, this.flushFrequency);
    }

    async flushLogBuffers() {
        for (const [logFile, buffer] of this.logBuffers.entries()) {
            if (buffer.length > 0) {
                try {
                    const content = buffer.join('');
                    await fs.appendFile(logFile, content);
                    
                    // Clear buffer
                    this.logBuffers.set(logFile, []);
                    
                    // Check for log rotation
                    await this.checkLogRotation(logFile);
                    
                } catch (error) {
                    console.error(`Failed to flush log buffer for ${logFile}:`, error);
                }
            }
        }
    }

    // Log Rotation
    async checkLogRotation(logFile) {
        try {
            const stats = await fs.stat(logFile);
            
            if (stats.size > this.config.maxLogSize) {
                await this.rotateLog(logFile);
            }
        } catch (error) {
            console.error(`Failed to check log rotation for ${logFile}:`, error);
        }
    }

    async rotateLog(logFile) {
        try {
            const baseName = path.basename(logFile, path.extname(logFile));
            const extension = path.extname(logFile);
            const directory = path.dirname(logFile);
            
            // Rotate existing files
            for (let i = this.config.maxLogFiles - 1; i > 0; i--) {
                const oldFile = path.join(directory, `${baseName}.${i}${extension}`);
                const newFile = path.join(directory, `${baseName}.${i + 1}${extension}`);
                
                try {
                    await fs.access(oldFile);
                    await fs.rename(oldFile, newFile);
                } catch (error) {
                    // File doesn't exist, continue
                }
            }
            
            // Move current log to .1
            const rotatedFile = path.join(directory, `${baseName}.1${extension}`);
            await fs.rename(logFile, rotatedFile);
            
            // Create new log file
            await fs.writeFile(logFile, '');
            
            this.info('Log rotated', {
                component: 'logging-system',
                originalFile: logFile,
                rotatedFile: rotatedFile
            });
            
        } catch (error) {
            console.error(`Failed to rotate log ${logFile}:`, error);
        }
    }

    // Metrics Collection
    startMetricsCollection() {
        this.metricsInterval = setInterval(() => {
            this.collectSystemMetrics();
        }, this.config.metricsInterval);
        
        this.info('Metrics collection started', {
            component: 'metrics-collector',
            interval: this.config.metricsInterval
        });
    }

    async collectSystemMetrics() {
        try {
            // System metrics
            const memoryUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();
            const uptime = process.uptime();
            
            this.metrics.system = {
                memory: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
                cpu: Math.round(cpuUsage.user / 1000), // ms
                uptime: Math.round(uptime)
            };
            
            // Create performance snapshot
            const snapshot = {
                timestamp: Date.now(),
                memory: this.metrics.system.memory,
                cpu: this.metrics.system.cpu,
                requests: { ...this.metrics.requests },
                actions: { ...this.metrics.actions },
                recovery: { ...this.metrics.recovery },
                websocket: { ...this.metrics.websocket },
                errors: { ...this.metrics.errors }
            };
            
            // Add to history
            this.performanceHistory.unshift(snapshot);
            
            // Limit history size
            if (this.performanceHistory.length > this.maxHistorySize) {
                this.performanceHistory = this.performanceHistory.slice(0, this.maxHistorySize);
            }
            
            // Log performance metrics
            this.performance('system', 'memory', this.metrics.system.memory, { unit: 'MB' });
            this.performance('system', 'uptime', this.metrics.system.uptime, { unit: 's' });
            
            // Check for performance issues
            this.checkPerformanceThresholds();
            
        } catch (error) {
            this.error('Failed to collect system metrics', {
                component: 'metrics-collector',
                error: error.message
            });
        }
    }

    checkPerformanceThresholds() {
        // Memory threshold (100MB)
        if (this.metrics.system.memory > 100) {
            this.warn('High memory usage detected', {
                component: 'performance-monitor',
                memory: this.metrics.system.memory,
                threshold: 100
            });
        }
        
        // Error rate threshold (10%)
        const errorRate = this.metrics.requests.total > 0 ? 
            (this.metrics.requests.failed / this.metrics.requests.total) * 100 : 0;
        
        if (errorRate > 10) {
            this.warn('High error rate detected', {
                component: 'performance-monitor',
                errorRate: errorRate.toFixed(2),
                threshold: 10
            });
        }
    }

    updateAverageDuration(type, duration) {
        const current = this.metrics[type].avgDuration;
        const total = this.metrics[type].total;
        
        // Calculate running average
        this.metrics[type].avgDuration = Math.round(
            ((current * (total - 1)) + duration) / total
        );
    }

    // Component Health Tracking
    updateComponentHealth(component, healthy, issues = 0) {
        if (this.metrics.components[component]) {
            this.metrics.components[component].healthy = healthy;
            this.metrics.components[component].lastCheck = Date.now();
            this.metrics.components[component].issues = issues;
            
            if (!healthy) {
                this.warn(`Component health degraded: ${component}`, {
                    component: 'health-monitor',
                    componentName: component,
                    issues
                });
            }
        }
    }

    // Diagnostic Report Generation
    async generateDiagnosticReport() {
        try {
            const report = {
                timestamp: new Date().toISOString(),
                system: {
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    cpu: process.cpuUsage(),
                    platform: process.platform,
                    nodeVersion: process.version
                },
                metrics: { ...this.metrics },
                recentPerformance: this.performanceHistory.slice(0, 60), // Last hour
                logFiles: await this.getLogFileInfo(),
                configuration: {
                    logLevel: this.config.logLevel,
                    logDirectory: this.config.logDirectory,
                    enableMetrics: this.config.enableMetrics
                }
            };
            
            // Save diagnostic report
            const reportPath = path.join(this.config.logDirectory, `diagnostic-${Date.now()}.json`);
            await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
            
            this.info('Diagnostic report generated', {
                component: 'diagnostics',
                reportPath
            });
            
            return report;
            
        } catch (error) {
            this.error('Failed to generate diagnostic report', {
                component: 'diagnostics',
                error: error.message
            });
            throw error;
        }
    }

    async getLogFileInfo() {
        const fileInfo = {};
        
        for (const [type, filePath] of Object.entries(this.logFiles)) {
            try {
                const stats = await fs.stat(filePath);
                fileInfo[type] = {
                    path: filePath,
                    size: stats.size,
                    modified: stats.mtime,
                    exists: true
                };
            } catch (error) {
                fileInfo[type] = {
                    path: filePath,
                    exists: false,
                    error: error.message
                };
            }
        }
        
        return fileInfo;
    }

    // Public API Methods
    getMetrics() {
        return {
            ...this.metrics,
            uptime: process.uptime(),
            timestamp: Date.now()
        };
    }

    getPerformanceHistory(limit = 60) {
        return this.performanceHistory.slice(0, limit);
    }

    async getRecentLogs(logType = 'main', limit = 100) {
        try {
            const logFile = this.logFiles[logType];
            const content = await fs.readFile(logFile, 'utf8');
            const lines = content.trim().split('\n').filter(line => line);
            
            return lines.slice(-limit).map(line => {
                try {
                    return JSON.parse(line);
                } catch (error) {
                    return { raw: line, parseError: true };
                }
            });
            
        } catch (error) {
            this.error('Failed to read recent logs', {
                component: 'log-reader',
                logType,
                error: error.message
            });
            return [];
        }
    }

    // Cleanup
    async cleanup() {
        this.info('Logging System shutting down', {
            component: 'logging-system'
        });
        
        // Stop intervals
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }
        
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
        }
        
        // Flush remaining buffers
        await this.flushLogBuffers();
        
        // Remove all listeners
        this.removeAllListeners();
        
        console.log('✅ Logging System cleanup completed');
    }
}

module.exports = LoggingSystem;