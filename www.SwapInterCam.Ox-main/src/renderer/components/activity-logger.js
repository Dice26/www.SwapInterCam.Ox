// Activity Logger - Comprehensive activity logging and audit integration

class ActivityLogger {
    constructor() {
        this.isInitialized = false;
        this.logQueue = [];
        this.maxQueueSize = 100;
        this.batchSize = 10;
        this.flushInterval = 5000; // 5 seconds
        this.flushTimer = null;
        this.sessionId = this.generateSessionId();

        this.initialize();
    }

    async initialize() {
        if (this.isInitialized) return;

        console.log('Initializing Activity Logger...');

        try {
            // Start automatic log flushing
            this.startAutoFlush();

            // Setup event listeners for automatic logging
            this.setupAutoLogging();

            // Log initialization
            await this.logActivity('system_initialized', {
                component: 'activity_logger',
                sessionId: this.sessionId,
                timestamp: new Date().toISOString()
            });

            this.isInitialized = true;
            console.log('Activity Logger initialized successfully');
        } catch (error) {
            this.log('Failed to initialize Activity Logger:', error);
            throw error;
        }
    }

    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async logActivity(action, data = {}, priority = 'normal') {
        const logEntry = {
            id: this.generateLogId(),
            action: action,
            data: {
                ...data,
                sessionId: this.sessionId,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                url: window.location.href
            },
            priority: priority,
            timestamp: new Date().toISOString(),
            source: 'chat-desktop-ui'
        };

        console.log(`Logging activity: ${action}`, logEntry);

        // Add to queue
        this.logQueue.push(logEntry);

        // Limit queue size
        if (this.logQueue.length > this.maxQueueSize) {
            this.log('Log queue full, removing oldest entries');
            this.logQueue = this.logQueue.slice(-this.maxQueueSize);
        }

        // Flush immediately for high priority logs
        if (priority === 'high' || priority === 'critical') {
            await this.flushLogs();
        }

        return logEntry.id;
    }

    generateLogId() {
        return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async flushLogs() {
        if (this.logQueue.length === 0) return;

        console.log(`Flushing ${this.logQueue.length} log entries...`);

        // Get batch of logs to send
        const logsToSend = this.logQueue.splice(0, this.batchSize);

        try {
            // Send logs to SWEP system
            const result = await this.sendLogsToSwep(logsToSend);

            if (result.success) {
                console.log(`Successfully sent ${logsToSend.length} log entries`);
            } else {
                this.log('Failed to send logs:', result.error);
                // Put logs back in queue for retry
                this.logQueue.unshift(...logsToSend);
            }
        } catch (error) {
            this.log('Error flushing logs:', error);
            // Put logs back in queue for retry
            this.logQueue.unshift(...logsToSend);
        }
    }

    async sendLogsToSwep(logs) {
        try {
            // Send each log individually for better error handling
            const results = await Promise.allSettled(
                logs.map(log => window.electronAPI.swep.logActivity(log))
            );

            const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const failed = results.length - successful;

            if (failed > 0) {
                this.log(`${failed} out of ${results.length} logs failed to send`);
            }

            return {
                success: successful > 0,
                successful: successful,
                failed: failed,
                total: results.length
            };
        } catch (error) {
            this.log('Error sending logs to SWEP:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    startAutoFlush() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }

        this.flushTimer = setInterval(async () => {
            if (this.logQueue.length > 0) {
                await this.flushLogs();
            }
        }, this.flushInterval);

        console.log(`Started auto-flush with ${this.flushInterval}ms interval`);
    }

    stopAutoFlush() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
            console.log('Stopped auto-flush');
        }
    }

    setupAutoLogging() {
        // Log application events
        document.addEventListener('app-switched', (event) => {
            const { from, to } = event.detail;
            this.logActivity('app_switched', {
                from: from,
                to: to,
                timestamp: event.detail.timestamp
            });
        });

        // Log tab switches
        document.addEventListener('tab-switched', (event) => {
            const { from, to } = event.detail;
            this.logActivity('tab_switched', {
                from: from,
                to: to,
                timestamp: event.detail.timestamp
            });
        });

        // Log webview events
        document.addEventListener('webview-ready', (event) => {
            const { appName, config } = event.detail;
            this.logActivity('webview_ready', {
                appName: appName,
                appUrl: config.url
            });
        });

        document.addEventListener('webview-error', (event) => {
            const { appName, error } = event.detail;
            this.logActivity('webview_error', {
                appName: appName,
                error: error
            }, 'high');
        });

        // Log camera access events
        document.addEventListener('camera-access-granted', (event) => {
            const { appName } = event.detail;
            this.logActivity('camera_access_granted', {
                appName: appName
            }, 'high');
        });

        document.addEventListener('camera-access-denied', (event) => {
            const { appName } = event.detail;
            this.logActivity('camera_access_denied', {
                appName: appName
            }, 'high');
        });

        document.addEventListener('camera-access-validated', (event) => {
            const { granted, reason, user } = event.detail;
            this.logActivity('camera_access_validated', {
                granted: granted,
                reason: reason,
                userId: user?.id
            }, 'high');
        });

        // Log security events
        document.addEventListener('security-event', (event) => {
            const { type, details } = event.detail;
            this.logActivity('security_event', {
                securityEventType: type,
                details: details
            }, 'critical');
        });

        // Log session events
        document.addEventListener('session-updated', (event) => {
            const { appName, key } = event.detail;
            this.logActivity('session_updated', {
                appName: appName,
                sessionKey: key
            });
        });

        document.addEventListener('session-cleared', (event) => {
            const { appName } = event.detail;
            this.logActivity('session_cleared', {
                appName: appName
            }, 'high');
        });

        // Log window events
        window.addEventListener('focus', () => {
            this.logActivity('window_focused');
        });

        window.addEventListener('blur', () => {
            this.logActivity('window_blurred');
        });

        // Log page visibility changes
        document.addEventListener('visibilitychange', () => {
            this.logActivity('visibility_changed', {
                hidden: document.hidden
            });
        });

        // Log errors
        window.addEventListener('error', (event) => {
            this.logActivity('javascript_error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            }, 'critical');
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.logActivity('unhandled_promise_rejection', {
                reason: event.reason?.toString(),
                stack: event.reason?.stack
            }, 'critical');
        });
    }

    // Specific logging methods for common activities
    async logUserAction(action, details = {}) {
        return await this.logActivity(`user_${action}`, {
            ...details,
            category: 'user_interaction'
        });
    }

    async logSystemEvent(event, details = {}) {
        return await this.logActivity(`system_${event}`, {
            ...details,
            category: 'system_event'
        });
    }

    async logSecurityEvent(event, details = {}) {
        return await this.logActivity(`security_${event}`, {
            ...details,
            category: 'security'
        }, 'critical');
    }

    async logCameraEvent(event, details = {}) {
        return await this.logActivity(`camera_${event}`, {
            ...details,
            category: 'camera_access'
        }, 'high');
    }

    async logAuthenticationEvent(event, details = {}) {
        return await this.logActivity(`auth_${event}`, {
            ...details,
            category: 'authentication'
        }, 'high');
    }

    async logNetworkEvent(event, details = {}) {
        return await this.logActivity(`network_${event}`, {
            ...details,
            category: 'network'
        });
    }

    // Audit trail methods
    async startAuditSession(userId, sessionType = 'normal') {
        const auditSessionId = this.generateSessionId();

        await this.logActivity('audit_session_started', {
            auditSessionId: auditSessionId,
            userId: userId,
            sessionType: sessionType,
            startTime: new Date().toISOString()
        }, 'high');

        return auditSessionId;
    }

    async endAuditSession(auditSessionId, summary = {}) {
        await this.logActivity('audit_session_ended', {
            auditSessionId: auditSessionId,
            endTime: new Date().toISOString(),
            summary: summary
        }, 'high');
    }

    async logComplianceEvent(event, details = {}) {
        return await this.logActivity(`compliance_${event}`, {
            ...details,
            category: 'compliance',
            requiresReview: true
        }, 'critical');
    }

    // Statistics and monitoring
    getLogStatistics() {
        const stats = {
            queueSize: this.logQueue.length,
            sessionId: this.sessionId,
            isAutoFlushActive: this.flushTimer !== null,
            flushInterval: this.flushInterval,
            maxQueueSize: this.maxQueueSize,
            batchSize: this.batchSize
        };

        // Count logs by priority
        stats.priorityBreakdown = this.logQueue.reduce((acc, log) => {
            acc[log.priority] = (acc[log.priority] || 0) + 1;
            return acc;
        }, {});

        return stats;
    }

    getRecentLogs(count = 10) {
        return this.logQueue.slice(-count);
    }

    // Configuration methods
    setFlushInterval(intervalMs) {
        this.flushInterval = intervalMs;
        this.startAutoFlush(); // Restart with new interval
        console.log(`Flush interval updated to ${intervalMs}ms`);
    }

    setBatchSize(size) {
        this.batchSize = size;
        console.log(`Batch size updated to ${size}`);
    }

    setMaxQueueSize(size) {
        this.maxQueueSize = size;
        console.log(`Max queue size updated to ${size}`);
    }

    // Cleanup
    async destroy() {
        console.log('Destroying Activity Logger...');

        // Stop auto-flush
        this.stopAutoFlush();

        // Flush remaining logs
        if (this.logQueue.length > 0) {
            console.log('Flushing remaining logs before shutdown...');
            await this.flushLogs();
        }

        // Log shutdown
        await this.logActivity('system_shutdown', {
            component: 'activity_logger',
            sessionId: this.sessionId,
            finalQueueSize: this.logQueue.length
        }, 'high');

        // Final flush
        await this.flushLogs();

        this.logQueue = [];
        this.isInitialized = false;
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] activity-logger ${level}: ${message}`;

        if (level === 'ERROR') {
            console.warn(logMessage);
        } else {
            console.log(logMessage);
        }
    }
}

// Export for use in main scripts
window.ActivityLogger = ActivityLogger;