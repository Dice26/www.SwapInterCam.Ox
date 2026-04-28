/**
 * Monitoring Dashboard
 * Provides real-time monitoring capabilities and system insights
 */

const EventEmitter = require('events');

class MonitoringDashboard extends EventEmitter {
    constructor(loggingSystem, stateManager) {
        super();
        this.loggingSystem = loggingSystem;
        this.stateManager = stateManager;
        
        // Dashboard state
        this.dashboardState = {
            alerts: [],
            trends: {},
            healthScore: 100,
            lastUpdate: Date.now()
        };
        
        // Alert thresholds
        this.thresholds = {
            memory: { warning: 80, critical: 150 }, // MB
            errorRate: { warning: 5, critical: 15 }, // %
            responseTime: { warning: 1000, critical: 3000 }, // ms
            diskSpace: { warning: 80, critical: 95 }, // %
            uptime: { minimum: 300 } // 5 minutes
        };
        
        // Trend analysis
        this.trendWindow = 300000; // 5 minutes
        this.trendData = {
            requests: [],
            errors: [],
            performance: [],
            recovery: []
        };
        
        // Alert management
        this.activeAlerts = new Map();
        this.alertHistory = [];
        this.maxAlertHistory = 1000;
        
        this.setupEventListeners();
        
        console.log('📊 Monitoring Dashboard initialized');
    }

    setupEventListeners() {
        // Listen to logging system events
        this.loggingSystem.on('log', (logEntry) => {
            this.processLogEntry(logEntry);
        });
        
        // Listen to state manager events
        if (this.stateManager) {
            this.stateManager.onStateChange((event) => {
                this.processStateChange(event);
            });
        }
    }

    processLogEntry(logEntry) {
        // Update trend data
        this.updateTrendData(logEntry);
        
        // Check for alert conditions
        this.checkAlertConditions(logEntry);
        
        // Update health score
        this.updateHealthScore(logEntry);
    }

    processStateChange(event) {
        // Track state changes for monitoring
        this.loggingSystem.info('System state changed', {
            component: 'monitoring-dashboard',
            changes: event.changes?.length || 0,
            newHealth: event.newState?.health
        });
        
        // Update component health metrics
        if (event.newState) {
            this.updateComponentHealthMetrics(event.newState);
        }
    }

    updateTrendData(logEntry) {
        const now = Date.now();
        const cutoff = now - this.trendWindow;
        
        // Add new data point
        if (logEntry.level === 'ERROR') {
            this.trendData.errors.push({ timestamp: now, entry: logEntry });
        }
        
        if (logEntry.component === 'http-server') {
            this.trendData.requests.push({ timestamp: now, entry: logEntry });
        }
        
        if (logEntry.component === 'performance-monitor') {
            this.trendData.performance.push({ timestamp: now, entry: logEntry });
        }
        
        if (logEntry.component === 'recovery-system') {
            this.trendData.recovery.push({ timestamp: now, entry: logEntry });
        }
        
        // Clean old data
        Object.keys(this.trendData).forEach(key => {
            this.trendData[key] = this.trendData[key].filter(item => item.timestamp > cutoff);
        });
    }

    checkAlertConditions(logEntry) {
        // Memory usage alerts
        if (logEntry.component === 'performance-monitor' && logEntry.metric === 'memory') {
            this.checkMemoryAlert(logEntry.value);
        }
        
        // Error rate alerts
        if (logEntry.level === 'ERROR') {
            this.checkErrorRateAlert();
        }
        
        // Response time alerts
        if (logEntry.duration && logEntry.duration > this.thresholds.responseTime.warning) {
            this.createAlert('response-time', 'warning', 
                `Slow response detected: ${logEntry.duration}ms`, logEntry);
        }
        
        // Component health alerts
        if (logEntry.component === 'health-monitor' && !logEntry.healthy) {
            this.createAlert('component-health', 'warning',
                `Component health degraded: ${logEntry.componentName}`, logEntry);
        }
    }

    checkMemoryAlert(memoryUsage) {
        const alertId = 'memory-usage';
        
        if (memoryUsage > this.thresholds.memory.critical) {
            this.createAlert(alertId, 'critical', 
                `Critical memory usage: ${memoryUsage}MB`, { memoryUsage });
        } else if (memoryUsage > this.thresholds.memory.warning) {
            this.createAlert(alertId, 'warning',
                `High memory usage: ${memoryUsage}MB`, { memoryUsage });
        } else {
            this.resolveAlert(alertId);
        }
    }

    checkErrorRateAlert() {
        const recentErrors = this.trendData.errors.length;
        const recentRequests = this.trendData.requests.length;
        
        if (recentRequests > 10) { // Only check if we have enough data
            const errorRate = (recentErrors / recentRequests) * 100;
            const alertId = 'error-rate';
            
            if (errorRate > this.thresholds.errorRate.critical) {
                this.createAlert(alertId, 'critical',
                    `Critical error rate: ${errorRate.toFixed(2)}%`, { errorRate, recentErrors, recentRequests });
            } else if (errorRate > this.thresholds.errorRate.warning) {
                this.createAlert(alertId, 'warning',
                    `High error rate: ${errorRate.toFixed(2)}%`, { errorRate, recentErrors, recentRequests });
            } else {
                this.resolveAlert(alertId);
            }
        }
    }

    createAlert(id, severity, message, data = {}) {
        const existingAlert = this.activeAlerts.get(id);
        
        // Don't create duplicate alerts
        if (existingAlert && existingAlert.severity === severity) {
            existingAlert.count++;
            existingAlert.lastSeen = Date.now();
            return;
        }
        
        const alert = {
            id,
            severity,
            message,
            data,
            createdAt: Date.now(),
            lastSeen: Date.now(),
            count: 1,
            resolved: false
        };
        
        this.activeAlerts.set(id, alert);
        this.dashboardState.alerts.push(alert);
        
        // Log the alert
        this.loggingSystem.warn(`Alert created: ${message}`, {
            component: 'monitoring-dashboard',
            alertId: id,
            severity,
            data
        });
        
        // Emit alert event
        this.emit('alert-created', alert);
    }

    resolveAlert(id) {
        const alert = this.activeAlerts.get(id);
        if (alert && !alert.resolved) {
            alert.resolved = true;
            alert.resolvedAt = Date.now();
            
            // Move to history
            this.alertHistory.unshift(alert);
            if (this.alertHistory.length > this.maxAlertHistory) {
                this.alertHistory = this.alertHistory.slice(0, this.maxAlertHistory);
            }
            
            // Remove from active alerts
            this.activeAlerts.delete(id);
            
            // Remove from dashboard state
            this.dashboardState.alerts = this.dashboardState.alerts.filter(a => a.id !== id);
            
            this.loggingSystem.info(`Alert resolved: ${alert.message}`, {
                component: 'monitoring-dashboard',
                alertId: id,
                duration: alert.resolvedAt - alert.createdAt
            });
            
            this.emit('alert-resolved', alert);
        }
    }

    updateHealthScore(logEntry) {
        let scoreChange = 0;
        
        // Positive impacts
        if (logEntry.level === 'INFO' && logEntry.success) {
            scoreChange += 0.1;
        }
        
        // Negative impacts
        if (logEntry.level === 'ERROR') {
            scoreChange -= 2;
        } else if (logEntry.level === 'WARN') {
            scoreChange -= 0.5;
        }
        
        // Recovery operations
        if (logEntry.component === 'recovery-system' && logEntry.success) {
            scoreChange += 1;
        }
        
        // Apply score change
        this.dashboardState.healthScore = Math.max(0, Math.min(100, 
            this.dashboardState.healthScore + scoreChange));
        
        // Gradual recovery towards 100
        if (scoreChange === 0 && this.dashboardState.healthScore < 100) {
            this.dashboardState.healthScore = Math.min(100, this.dashboardState.healthScore + 0.01);
        }
    }

    updateComponentHealthMetrics(systemState) {
        const components = ['cameras', 'obs', 'windows'];
        
        components.forEach(component => {
            if (systemState[component]) {
                const issues = systemState[component].issues?.length || 0;
                const healthy = issues === 0;
                
                this.loggingSystem.updateComponentHealth(component, healthy, issues);
            }
        });
    }

    // Analytics and Insights
    generateInsights() {
        const insights = {
            timestamp: Date.now(),
            healthScore: this.dashboardState.healthScore,
            activeAlerts: this.activeAlerts.size,
            trends: this.analyzeTrends(),
            recommendations: this.generateRecommendations(),
            systemSummary: this.generateSystemSummary()
        };
        
        return insights;
    }

    analyzeTrends() {
        const now = Date.now();
        const trends = {};
        
        // Error trend
        const errorCounts = this.getTimeSeriesData(this.trendData.errors, 60000); // 1-minute buckets
        trends.errors = {
            current: errorCounts[errorCounts.length - 1] || 0,
            trend: this.calculateTrend(errorCounts),
            data: errorCounts
        };
        
        // Request trend
        const requestCounts = this.getTimeSeriesData(this.trendData.requests, 60000);
        trends.requests = {
            current: requestCounts[requestCounts.length - 1] || 0,
            trend: this.calculateTrend(requestCounts),
            data: requestCounts
        };
        
        // Performance trend
        const performanceData = this.loggingSystem.getPerformanceHistory(10);
        if (performanceData.length > 0) {
            const memoryTrend = performanceData.map(p => p.memory);
            trends.memory = {
                current: memoryTrend[0] || 0,
                trend: this.calculateTrend(memoryTrend),
                data: memoryTrend
            };
        }
        
        return trends;
    }

    getTimeSeriesData(dataPoints, bucketSize) {
        const now = Date.now();
        const buckets = [];
        const numBuckets = Math.ceil(this.trendWindow / bucketSize);
        
        for (let i = 0; i < numBuckets; i++) {
            const bucketStart = now - (i + 1) * bucketSize;
            const bucketEnd = now - i * bucketSize;
            
            const count = dataPoints.filter(point => 
                point.timestamp >= bucketStart && point.timestamp < bucketEnd
            ).length;
            
            buckets.unshift(count);
        }
        
        return buckets;
    }

    calculateTrend(data) {
        if (data.length < 2) return 'stable';
        
        const recent = data.slice(-3);
        const older = data.slice(-6, -3);
        
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;
        
        const change = ((recentAvg - olderAvg) / (olderAvg || 1)) * 100;
        
        if (change > 20) return 'increasing';
        if (change < -20) return 'decreasing';
        return 'stable';
    }

    generateRecommendations() {
        const recommendations = [];
        const metrics = this.loggingSystem.getMetrics();
        
        // Memory recommendations
        if (metrics.system.memory > this.thresholds.memory.warning) {
            recommendations.push({
                type: 'performance',
                priority: 'high',
                title: 'High Memory Usage',
                description: `Memory usage is ${metrics.system.memory}MB. Consider restarting the service or investigating memory leaks.`,
                action: 'restart-system'
            });
        }
        
        // Error rate recommendations
        const errorRate = metrics.requests.total > 0 ? 
            (metrics.requests.failed / metrics.requests.total) * 100 : 0;
        
        if (errorRate > this.thresholds.errorRate.warning) {
            recommendations.push({
                type: 'reliability',
                priority: 'medium',
                title: 'High Error Rate',
                description: `Error rate is ${errorRate.toFixed(2)}%. Check logs for recurring issues.`,
                action: 'review-logs'
            });
        }
        
        // Recovery recommendations
        if (metrics.recovery.failed > metrics.recovery.successful) {
            recommendations.push({
                type: 'recovery',
                priority: 'high',
                title: 'Recovery Issues',
                description: 'Recovery operations are failing more than succeeding. Review recovery modules.',
                action: 'check-recovery-modules'
            });
        }
        
        // Component health recommendations
        Object.entries(metrics.components).forEach(([component, health]) => {
            if (!health.healthy && health.issues > 0) {
                recommendations.push({
                    type: 'component',
                    priority: 'medium',
                    title: `${component} Issues`,
                    description: `${component} has ${health.issues} active issues.`,
                    action: `fix-${component}`
                });
            }
        });
        
        return recommendations;
    }

    generateSystemSummary() {
        const metrics = this.loggingSystem.getMetrics();
        const uptime = process.uptime();
        
        return {
            uptime: {
                seconds: Math.round(uptime),
                formatted: this.formatUptime(uptime)
            },
            requests: {
                total: metrics.requests.total,
                successRate: metrics.requests.total > 0 ? 
                    ((metrics.requests.successful / metrics.requests.total) * 100).toFixed(2) : 0
            },
            actions: {
                total: metrics.actions.total,
                successRate: metrics.actions.total > 0 ? 
                    ((metrics.actions.successful / metrics.actions.total) * 100).toFixed(2) : 0,
                avgDuration: metrics.actions.avgDuration
            },
            recovery: {
                total: metrics.recovery.total,
                successRate: metrics.recovery.total > 0 ? 
                    ((metrics.recovery.successful / metrics.recovery.total) * 100).toFixed(2) : 0,
                avgDuration: metrics.recovery.avgDuration
            },
            system: {
                memory: metrics.system.memory,
                healthScore: Math.round(this.dashboardState.healthScore)
            }
        };
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    // Public API Methods
    getDashboardData() {
        return {
            ...this.dashboardState,
            insights: this.generateInsights(),
            metrics: this.loggingSystem.getMetrics(),
            lastUpdate: Date.now()
        };
    }

    getActiveAlerts() {
        return Array.from(this.activeAlerts.values());
    }

    getAlertHistory(limit = 50) {
        return this.alertHistory.slice(0, limit);
    }

    async generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            dashboard: this.getDashboardData(),
            diagnostics: await this.loggingSystem.generateDiagnosticReport(),
            recommendations: this.generateRecommendations()
        };
        
        return report;
    }

    // Alert Management
    acknowledgeAlert(alertId) {
        const alert = this.activeAlerts.get(alertId);
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledgedAt = Date.now();
            
            this.loggingSystem.info(`Alert acknowledged: ${alert.message}`, {
                component: 'monitoring-dashboard',
                alertId
            });
            
            this.emit('alert-acknowledged', alert);
        }
    }

    // Cleanup
    cleanup() {
        console.log('🧹 Cleaning up Monitoring Dashboard...');
        this.removeAllListeners();
    }
}

module.exports = MonitoringDashboard;