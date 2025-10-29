/**
 * Comprehensive Monitoring System
 * System metrics collection, performance monitoring, and health checks
 */

const os = require('os');
const process = require('process');
const EventEmitter = require('events');

class SystemMonitor extends EventEmitter {
    constructor(logger, options = {}) {
        super();
        this.logger = logger;
        this.collectInterval = options.collectInterval || 30000; // 30 seconds
        this.retentionPeriod = options.retentionPeriod || 24 * 60 * 60 * 1000; // 24 hours
        this.alertThresholds = options.alertThresholds || {
            cpu: 80,           // CPU usage %
            memory: 85,        // Memory usage %
            disk: 90,          // Disk usage %
            responseTime: 5000, // Response time ms
            errorRate: 10      // Error rate %
        };
        
        // Metrics storage
        this.metrics = {
            system: [],
            performance: [],
            errors: [],
            actions: [],
            connections: [],
            issues: []
        };
        
        // Current state
        this.currentMetrics = {
            system: null,
            performance: null,
            health: 'unknown'
        };
        
        // Monitoring state
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.startTime = Date.now();
        
        // Performance tracking
        this.performanceCounters = {
            requests: { total: 0, success: 0, error: 0 },
            actions: { total: 0, success: 0, error: 0 },
            connections: { total: 0, active: 0, failed: 0 },
            issues: { detected: 0, resolved: 0 },
            recovery: { attempts: 0, success: 0, failed: 0 }
        };
        
        console.log('📊 System Monitor initialized');
    }

    startMonitoring() {
        if (this.isMonitoring) {
            console.log('📊 Monitoring already running');
            return;
        }
        
        console.log(`📊 Starting system monitoring (interval: ${this.collectInterval}ms)`);
        
        this.isMonitoring = true;
        
        // Collect initial metrics
        this.collectMetrics();
        
        // Start periodic collection
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
        }, this.collectInterval);
        
        // Start cleanup interval (every hour)
        this.cleanupInterval = setInterval(() => {
            this.cleanupOldMetrics();
        }, 60 * 60 * 1000);
        
        this.logger.info('System monitoring started', {
            type: 'monitoring',
            interval: this.collectInterval,
            thresholds: this.alertThresholds
        });
    }

    stopMonitoring() {
        if (!this.isMonitoring) {
            return;
        }
        
        console.log('📊 Stopping system monitoring');
        
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        
        this.logger.info('System monitoring stopped', { type: 'monitoring' });
    }

    async collectMetrics() {
        try {
            const timestamp = Date.now();
            
            // Collect system metrics
            const systemMetrics = await this.collectSystemMetrics();
            
            // Collect performance metrics
            const performanceMetrics = this.collectPerformanceMetrics();
            
            // Store metrics
            this.metrics.system.push({ timestamp, ...systemMetrics });
            this.metrics.performance.push({ timestamp, ...performanceMetrics });
            
            // Update current metrics
            this.currentMetrics.system = systemMetrics;
            this.currentMetrics.performance = performanceMetrics;
            
            // Calculate health score
            const health = this.calculateHealthScore(systemMetrics, performanceMetrics);
            this.currentMetrics.health = health;
            
            // Check for alerts
            this.checkAlerts(systemMetrics, performanceMetrics);
            
            // Emit metrics update event
            this.emit('metrics-collected', {
                system: systemMetrics,
                performance: performanceMetrics,
                health
            });
            
            // Log performance metrics periodically
            if (this.metrics.system.length % 10 === 0) { // Every 10 collections
                this.logger.performance('Metrics collection', Date.now() - timestamp, {
                    systemMetrics,
                    performanceMetrics,
                    health
                });
            }
            
        } catch (error) {
            this.logger.error('Failed to collect metrics', { error });
        }
    }

    async collectSystemMetrics() {
        const cpus = os.cpus();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        
        // CPU usage calculation (simplified)
        const cpuUsage = await this.getCPUUsage();
        
        // Memory usage
        const memoryUsage = {
            total: totalMem,
            used: usedMem,
            free: freeMem,
            percentage: Math.round((usedMem / totalMem) * 100)
        };
        
        // Process metrics
        const processMetrics = {
            pid: process.pid,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage()
        };
        
        // Load average (Unix-like systems)
        const loadAverage = os.loadavg();
        
        return {
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
            cpuCount: cpus.length,
            cpuUsage,
            memoryUsage,
            loadAverage,
            uptime: os.uptime(),
            process: processMetrics
        };
    }

    async getCPUUsage() {
        return new Promise((resolve) => {
            const startUsage = process.cpuUsage();
            const startTime = process.hrtime();
            
            setTimeout(() => {
                const endUsage = process.cpuUsage(startUsage);
                const endTime = process.hrtime(startTime);
                
                const totalTime = endTime[0] * 1000000 + endTime[1] / 1000; // microseconds
                const totalUsage = endUsage.user + endUsage.system;
                
                const percentage = Math.round((totalUsage / totalTime) * 100);
                resolve(Math.min(percentage, 100)); // Cap at 100%
            }, 100);
        });
    }

    collectPerformanceMetrics() {
        const now = Date.now();
        const uptime = now - this.startTime;
        
        // Calculate rates (per minute)
        const timeWindow = Math.min(uptime, 60000); // Last minute or since start
        const requestRate = Math.round((this.performanceCounters.requests.total / timeWindow) * 60000);
        const actionRate = Math.round((this.performanceCounters.actions.total / timeWindow) * 60000);
        
        // Calculate success rates
        const requestSuccessRate = this.performanceCounters.requests.total > 0 ?
            Math.round((this.performanceCounters.requests.success / this.performanceCounters.requests.total) * 100) : 100;
        
        const actionSuccessRate = this.performanceCounters.actions.total > 0 ?
            Math.round((this.performanceCounters.actions.success / this.performanceCounters.actions.total) * 100) : 100;
        
        const recoverySuccessRate = this.performanceCounters.recovery.attempts > 0 ?
            Math.round((this.performanceCounters.recovery.success / this.performanceCounters.recovery.attempts) * 100) : 100;
        
        return {
            uptime,
            counters: { ...this.performanceCounters },
            rates: {
                requests: requestRate,
                actions: actionRate
            },
            successRates: {
                requests: requestSuccessRate,
                actions: actionSuccessRate,
                recovery: recoverySuccessRate
            },
            averageResponseTime: this.calculateAverageResponseTime()
        };
    }

    calculateAverageResponseTime() {
        // Get recent performance metrics
        const recentMetrics = this.metrics.performance.slice(-10); // Last 10 collections
        if (recentMetrics.length === 0) return 0;
        
        // This would be calculated from actual response time tracking
        // For now, return a placeholder based on system load
        const systemLoad = this.currentMetrics.system?.cpuUsage || 0;
        return Math.round(50 + (systemLoad * 2)); // Base 50ms + load factor
    }

    calculateHealthScore(systemMetrics, performanceMetrics) {
        let score = 100;
        const issues = [];
        
        // CPU health
        if (systemMetrics.cpuUsage > this.alertThresholds.cpu) {
            score -= 20;
            issues.push(`High CPU usage: ${systemMetrics.cpuUsage}%`);
        } else if (systemMetrics.cpuUsage > this.alertThresholds.cpu * 0.8) {
            score -= 10;
            issues.push(`Elevated CPU usage: ${systemMetrics.cpuUsage}%`);
        }
        
        // Memory health
        if (systemMetrics.memoryUsage.percentage > this.alertThresholds.memory) {
            score -= 20;
            issues.push(`High memory usage: ${systemMetrics.memoryUsage.percentage}%`);
        } else if (systemMetrics.memoryUsage.percentage > this.alertThresholds.memory * 0.8) {
            score -= 10;
            issues.push(`Elevated memory usage: ${systemMetrics.memoryUsage.percentage}%`);
        }
        
        // Performance health
        const avgResponseTime = performanceMetrics.averageResponseTime;
        if (avgResponseTime > this.alertThresholds.responseTime) {
            score -= 15;
            issues.push(`High response time: ${avgResponseTime}ms`);
        } else if (avgResponseTime > this.alertThresholds.responseTime * 0.8) {
            score -= 8;
            issues.push(`Elevated response time: ${avgResponseTime}ms`);
        }
        
        // Error rate health
        const errorRate = 100 - performanceMetrics.successRates.requests;
        if (errorRate > this.alertThresholds.errorRate) {
            score -= 15;
            issues.push(`High error rate: ${errorRate}%`);
        }
        
        // Determine health status
        let status;
        if (score >= 90) {
            status = 'healthy';
        } else if (score >= 70) {
            status = 'warning';
        } else if (score >= 50) {
            status = 'error';
        } else {
            status = 'critical';
        }
        
        return {
            status,
            score,
            issues
        };
    }

    checkAlerts(systemMetrics, performanceMetrics) {
        const alerts = [];
        
        // CPU alert
        if (systemMetrics.cpuUsage > this.alertThresholds.cpu) {
            alerts.push({
                type: 'cpu',
                level: 'warning',
                message: `High CPU usage: ${systemMetrics.cpuUsage}%`,
                threshold: this.alertThresholds.cpu,
                current: systemMetrics.cpuUsage
            });
        }
        
        // Memory alert
        if (systemMetrics.memoryUsage.percentage > this.alertThresholds.memory) {
            alerts.push({
                type: 'memory',
                level: 'warning',
                message: `High memory usage: ${systemMetrics.memoryUsage.percentage}%`,
                threshold: this.alertThresholds.memory,
                current: systemMetrics.memoryUsage.percentage
            });
        }
        
        // Response time alert
        const avgResponseTime = performanceMetrics.averageResponseTime;
        if (avgResponseTime > this.alertThresholds.responseTime) {
            alerts.push({
                type: 'response_time',
                level: 'warning',
                message: `High response time: ${avgResponseTime}ms`,
                threshold: this.alertThresholds.responseTime,
                current: avgResponseTime
            });
        }
        
        // Error rate alert
        const errorRate = 100 - performanceMetrics.successRates.requests;
        if (errorRate > this.alertThresholds.errorRate) {
            alerts.push({
                type: 'error_rate',
                level: 'error',
                message: `High error rate: ${errorRate}%`,
                threshold: this.alertThresholds.errorRate,
                current: errorRate
            });
        }
        
        // Emit alerts if any
        if (alerts.length > 0) {
            this.emit('alerts', alerts);
            alerts.forEach(alert => {
                this.logger.warn(`Alert: ${alert.message}`, {
                    type: 'alert',
                    alert
                });
            });
        }
    }

    // Performance counter methods
    recordRequest(success = true) {
        this.performanceCounters.requests.total++;
        if (success) {
            this.performanceCounters.requests.success++;
        } else {
            this.performanceCounters.requests.error++;
        }
    }

    recordAction(success = true) {
        this.performanceCounters.actions.total++;
        if (success) {
            this.performanceCounters.actions.success++;
        } else {
            this.performanceCounters.actions.error++;
        }
    }

    recordConnection(type = 'connected') {
        this.performanceCounters.connections.total++;
        if (type === 'connected') {
            this.performanceCounters.connections.active++;
        } else {
            this.performanceCounters.connections.failed++;
        }
    }

    recordIssue(type = 'detected') {
        if (type === 'detected') {
            this.performanceCounters.issues.detected++;
        } else if (type === 'resolved') {
            this.performanceCounters.issues.resolved++;
        }
    }

    recordRecovery(success = true) {
        this.performanceCounters.recovery.attempts++;
        if (success) {
            this.performanceCounters.recovery.success++;
        } else {
            this.performanceCounters.recovery.failed++;
        }
    }

    // Cleanup old metrics
    cleanupOldMetrics() {
        const cutoffTime = Date.now() - this.retentionPeriod;
        
        for (const [type, metrics] of Object.entries(this.metrics)) {
            const originalLength = metrics.length;
            this.metrics[type] = metrics.filter(metric => metric.timestamp > cutoffTime);
            const removedCount = originalLength - this.metrics[type].length;
            
            if (removedCount > 0) {
                console.log(`🧹 Cleaned up ${removedCount} old ${type} metrics`);
            }
        }
    }

    // Get current status
    getStatus() {
        return {
            isMonitoring: this.isMonitoring,
            uptime: Date.now() - this.startTime,
            currentMetrics: this.currentMetrics,
            counters: this.performanceCounters,
            metricsCount: {
                system: this.metrics.system.length,
                performance: this.metrics.performance.length,
                errors: this.metrics.errors.length,
                actions: this.metrics.actions.length,
                connections: this.metrics.connections.length,
                issues: this.metrics.issues.length
            }
        };
    }

    // Get metrics for time range
    getMetrics(type = 'system', startTime = null, endTime = null) {
        if (!this.metrics[type]) {
            return [];
        }
        
        let metrics = this.metrics[type];
        
        if (startTime) {
            metrics = metrics.filter(m => m.timestamp >= startTime);
        }
        
        if (endTime) {
            metrics = metrics.filter(m => m.timestamp <= endTime);
        }
        
        return metrics;
    }

    // Generate diagnostic report
    generateDiagnosticReport() {
        const status = this.getStatus();
        const recentSystem = this.metrics.system.slice(-10);
        const recentPerformance = this.metrics.performance.slice(-10);
        
        return {
            timestamp: new Date().toISOString(),
            status,
            recentMetrics: {
                system: recentSystem,
                performance: recentPerformance
            },
            summary: {
                healthStatus: this.currentMetrics.health?.status || 'unknown',
                healthScore: this.currentMetrics.health?.score || 0,
                currentIssues: this.currentMetrics.health?.issues || [],
                systemLoad: {
                    cpu: this.currentMetrics.system?.cpuUsage || 0,
                    memory: this.currentMetrics.system?.memoryUsage?.percentage || 0
                },
                performance: {
                    requestSuccessRate: this.currentMetrics.performance?.successRates?.requests || 100,
                    actionSuccessRate: this.currentMetrics.performance?.successRates?.actions || 100,
                    averageResponseTime: this.currentMetrics.performance?.averageResponseTime || 0
                }
            }
        };
    }

    // Cleanup
    async cleanup() {
        console.log('🧹 Cleaning up monitor...');
        this.stopMonitoring();
        this.removeAllListeners();
    }
}

module.exports = SystemMonitor;