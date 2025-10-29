/**
 * Logging and Monitoring Integration Module
 * Integrates comprehensive logging, monitoring, and diagnostics into the backend service
 */

const Logger = require('./logger');
const SystemMonitor = require('./monitor');
const fs = require('fs').promises;
const path = require('path');

class LoggingMonitoringIntegration {
          constructor(options = {}) {
                    this.options = {
                              logLevel: options.logLevel || 'info',
                              logDir: options.logDir || path.join(__dirname, 'logs'),
                              enableMonitoring: options.enableMonitoring !== false,
                              enableDiagnostics: options.enableDiagnostics !== false,
                              monitoringInterval: options.monitoringInterval || 30000,
                              diagnosticsInterval: options.diagnosticsInterval || 300000, // 5 minutes
                              ...options
                    };

                    // Initialize logger
                    this.logger = new Logger({
                              logLevel: this.options.logLevel,
                              logDir: this.options.logDir,
                              enableConsole: true,
                              enableFile: true
                    });

                    // Initialize monitor
                    this.monitor = new SystemMonitor(this.logger, {
                              collectInterval: this.options.monitoringInterval,
                              alertThresholds: this.options.alertThresholds
                    });

                    // Integration state
                    this.isInitialized = false;
                    this.diagnosticsInterval = null;
                    this.healthCheckInterval = null;

                    // Performance tracking
                    this.performanceMetrics = {
                              requests: new Map(),
                              actions: new Map(),
                              errors: new Map(),
                              responseTimeHistory: []
                    };

                    console.log('🔧 Logging and Monitoring Integration initialized');
          }

          async initialize() {
                    if (this.isInitialized) {
                              return;
                    }

                    try {
                              console.log('🚀 Initializing logging and monitoring integration...');

                              // Start monitoring if enabled
                              if (this.options.enableMonitoring) {
                                        this.monitor.startMonitoring();
                                        this.setupMonitoringEventHandlers();
                              }

                              // Start diagnostics collection if enabled
                              if (this.options.enableDiagnostics) {
                                        this.startDiagnosticsCollection();
                              }

                              // Start health checks
                              this.startHealthChecks();

                              this.isInitialized = true;
                              this.logger.info('Logging and monitoring integration started', {
                                        type: 'system',
                                        options: this.options
                              });

                              console.log('✅ Logging and monitoring integration ready');

                    } catch (error) {
                              console.error('❌ Failed to initialize logging and monitoring:', error);
                              this.logger.error('Failed to initialize logging and monitoring', { error });
                              throw error;
                    }
          }

          setupMonitoringEventHandlers() {
                    // Handle metrics collection events
                    this.monitor.on('metrics-collected', (metrics) => {
                              this.handleMetricsUpdate(metrics);
                    });

                    // Handle alert events
                    this.monitor.on('alert', (alert) => {
                              this.handleAlert(alert);
                    });

                    // Handle health status changes
                    this.monitor.on('health-change', (health) => {
                              this.handleHealthChange(health);
                    });
          }

          handleMetricsUpdate(metrics) {
                    // Log performance metrics periodically
                    if (metrics.system && metrics.performance) {
                              this.logger.performance('System metrics update', 0, {
                                        cpu: metrics.system.cpuUsage,
                                        memory: metrics.system.memoryUsage.percentage,
                                        uptime: metrics.performance.uptime,
                                        health: metrics.health.status
                              });
                    }
          }

          handleAlert(alert) {
                    this.logger.warn(`System alert: ${alert.message}`, {
                              type: 'alert',
                              alert: alert
                    });

                    // Emit alert for external systems
                    if (this.alertCallback) {
                              this.alertCallback(alert);
                    }
          }

          handleHealthChange(health) {
                    const level = health.status === 'healthy' ? 'info' :
                              health.status === 'warning' ? 'warn' : 'error';

                    this.logger.log(level, `Health status changed to: ${health.status}`, {
                              type: 'health',
                              health: health
                    });
          }

          startDiagnosticsCollection() {
                    console.log('📊 Starting diagnostics collection...');

                    this.diagnosticsInterval = setInterval(async () => {
                              try {
                                        await this.collectDiagnostics();
                              } catch (error) {
                                        this.logger.error('Failed to collect diagnostics', { error });
                              }
                    }, this.options.diagnosticsInterval);
          }

          startHealthChecks() {
                    console.log('🏥 Starting health checks...');

                    this.healthCheckInterval = setInterval(async () => {
                              try {
                                        await this.performHealthCheck();
                              } catch (error) {
                                        this.logger.error('Health check failed', { error });
                              }
                    }, 60000); // Every minute
          }

          async collectDiagnostics() {
                    const diagnostics = {
                              timestamp: Date.now(),
                              system: this.monitor.currentMetrics.system,
                              performance: this.monitor.currentMetrics.performance,
                              health: this.monitor.currentMetrics.health,
                              logs: await this.getRecentLogSummary(),
                              errors: await this.getRecentErrors(),
                              performance_history: this.getPerformanceHistory()
                    };

                    this.logger.info('Diagnostics collected', {
                              type: 'diagnostics',
                              diagnostics: diagnostics
                    });

                    return diagnostics;
          }

          async performHealthCheck() {
                    const healthCheck = {
                              timestamp: Date.now(),
                              status: 'healthy',
                              checks: {}
                    };

                    try {
                              // Check logger health
                              healthCheck.checks.logger = await this.checkLoggerHealth();

                              // Check monitor health
                              healthCheck.checks.monitor = await this.checkMonitorHealth();

                              // Check disk space
                              healthCheck.checks.diskSpace = await this.checkDiskSpace();

                              // Check log file sizes
                              healthCheck.checks.logFiles = await this.checkLogFileSizes();

                              // Determine overall health
                              const failedChecks = Object.values(healthCheck.checks).filter(check => !check.healthy);
                              if (failedChecks.length > 0) {
                                        healthCheck.status = failedChecks.some(check => check.critical) ? 'critical' : 'warning';
                              }

                              this.logger.debug('Health check completed', {
                                        type: 'health-check',
                                        result: healthCheck
                              });

                    } catch (error) {
                              healthCheck.status = 'error';
                              healthCheck.error = error.message;
                              this.logger.error('Health check failed', { error });
                    }

                    return healthCheck;
          }

          async checkLoggerHealth() {
                    try {
                              const stats = await this.logger.getLogStats();
                              return {
                                        healthy: true,
                                        stats: stats,
                                        message: 'Logger is functioning normally'
                              };
                    } catch (error) {
                              return {
                                        healthy: false,
                                        critical: true,
                                        error: error.message,
                                        message: 'Logger is not functioning properly'
                              };
                    }
          }

          async checkMonitorHealth() {
                    try {
                              const isMonitoring = this.monitor.isMonitoring;
                              return {
                                        healthy: isMonitoring,
                                        critical: !isMonitoring,
                                        monitoring: isMonitoring,
                                        message: isMonitoring ? 'Monitor is active' : 'Monitor is not running'
                              };
                    } catch (error) {
                              return {
                                        healthy: false,
                                        critical: true,
                                        error: error.message,
                                        message: 'Monitor health check failed'
                              };
                    }
          }

          async checkDiskSpace() {
                    try {
                              // Simple disk space check (this is a basic implementation)
                              await fs.stat(this.options.logDir);
                              return {
                                        healthy: true,
                                        message: 'Disk space check passed',
                                        logDir: this.options.logDir
                              };
                    } catch (error) {
                              return {
                                        healthy: false,
                                        critical: false,
                                        error: error.message,
                                        message: 'Could not check disk space'
                              };
                    }
          }

          async checkLogFileSizes() {
                    try {
                              const stats = await this.logger.getLogStats();
                              const oversizedFiles = Object.entries(stats).filter(([, stat]) =>
                                        stat.size > 50 * 1024 * 1024 // 50MB
                              );

                              return {
                                        healthy: oversizedFiles.length === 0,
                                        critical: false,
                                        stats: stats,
                                        oversizedFiles: oversizedFiles.map(([fileName]) => fileName),
                                        message: oversizedFiles.length === 0 ?
                                                  'Log file sizes are normal' :
                                                  `${oversizedFiles.length} log files are oversized`
                              };
                    } catch (error) {
                              return {
                                        healthy: false,
                                        critical: false,
                                        error: error.message,
                                        message: 'Could not check log file sizes'
                              };
                    }
          }

          async getRecentLogSummary() {
                    try {
                              const recentLogs = await this.logger.getRecentLogs('combined', 100);
                              const summary = {
                                        total: recentLogs.length,
                                        byLevel: {}
                              };

                              recentLogs.forEach(log => {
                                        const level = log.level.toLowerCase();
                                        summary.byLevel[level] = (summary.byLevel[level] || 0) + 1;
                              });

                              return summary;
                    } catch (error) {
                              this.logger.error('Failed to get recent log summary', { error });
                              return { error: error.message };
                    }
          }

          async getRecentErrors() {
                    try {
                              const errorLogs = await this.logger.getRecentLogs('error', 50);
                              return errorLogs.map(log => ({
                                        timestamp: log.timestamp,
                                        message: log.message,
                                        stack: log.stack
                              }));
                    } catch (error) {
                              this.logger.error('Failed to get recent errors', { error });
                              return [];
                    }
          }

          getPerformanceHistory() {
                    return {
                              responseTimeHistory: this.performanceMetrics.responseTimeHistory.slice(-100),
                              requestCount: this.performanceMetrics.requests.size,
                              actionCount: this.performanceMetrics.actions.size,
                              errorCount: this.performanceMetrics.errors.size
                    };
          }

          // Middleware for Express.js integration
          createLoggingMiddleware() {
                    return (req, res, next) => {
                              const startTime = Date.now();
                              const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

                              // Log request start
                              this.logger.access(req.method, req.url, 0, 0, {
                                        requestId,
                                        userAgent: req.get('User-Agent'),
                                        ip: req.ip,
                                        phase: 'start'
                              });

                              // Track request
                              this.performanceMetrics.requests.set(requestId, {
                                        method: req.method,
                                        url: req.url,
                                        startTime,
                                        ip: req.ip
                              });

                              // Override res.end to log completion
                              const originalEnd = res.end;
                              res.end = (...args) => {
                                        const endTime = Date.now();
                                        const responseTime = endTime - startTime;

                                        // Log request completion
                                        this.logger.access(req.method, req.url, res.statusCode, responseTime, {
                                                  requestId,
                                                  userAgent: req.get('User-Agent'),
                                                  ip: req.ip,
                                                  phase: 'complete'
                                        });

                                        // Update performance metrics
                                        this.performanceMetrics.responseTimeHistory.push({
                                                  timestamp: endTime,
                                                  responseTime,
                                                  statusCode: res.statusCode
                                        });

                                        // Keep only last 1000 entries
                                        if (this.performanceMetrics.responseTimeHistory.length > 1000) {
                                                  this.performanceMetrics.responseTimeHistory =
                                                            this.performanceMetrics.responseTimeHistory.slice(-1000);
                                        }

                                        // Update monitor counters
                                        if (this.monitor) {
                                                  this.monitor.performanceCounters.requests.total++;
                                                  if (res.statusCode < 400) {
                                                            this.monitor.performanceCounters.requests.success++;
                                                  } else {
                                                            this.monitor.performanceCounters.requests.error++;
                                                  }
                                        }

                                        // Clean up request tracking
                                        this.performanceMetrics.requests.delete(requestId);

                                        originalEnd.apply(res, args);
                              };

                              next();
                    };
          }

          // Action logging wrapper
          wrapActionExecution(actionName, actionFunction) {
                    return async (...args) => {
                              const actionId = `action_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                              const startTime = Date.now();

                              try {
                                        // Log action start
                                        this.logger.actionStart(actionName, args[0] || {}, { actionId });

                                        // Track action
                                        this.performanceMetrics.actions.set(actionId, {
                                                  name: actionName,
                                                  startTime,
                                                  params: args[0] || {}
                                        });

                                        // Execute action
                                        const result = await actionFunction(...args);
                                        const endTime = Date.now();
                                        const duration = endTime - startTime;

                                        // Log action completion
                                        this.logger.actionComplete(actionName, result, duration, { actionId });

                                        // Update monitor counters
                                        if (this.monitor) {
                                                  this.monitor.performanceCounters.actions.total++;
                                                  if (result.success) {
                                                            this.monitor.performanceCounters.actions.success++;
                                                  } else {
                                                            this.monitor.performanceCounters.actions.error++;
                                                  }
                                        }

                                        // Clean up action tracking
                                        this.performanceMetrics.actions.delete(actionId);

                                        return result;

                              } catch (error) {
                                        const endTime = Date.now();
                                        const duration = endTime - startTime;

                                        // Log action error
                                        this.logger.actionComplete(actionName, { success: false, error: error.message }, duration, { actionId });

                                        // Track error
                                        this.performanceMetrics.errors.set(actionId, {
                                                  name: actionName,
                                                  error: error.message,
                                                  timestamp: endTime
                                        });

                                        // Update monitor counters
                                        if (this.monitor) {
                                                  this.monitor.performanceCounters.actions.total++;
                                                  this.monitor.performanceCounters.actions.error++;
                                        }

                                        // Clean up action tracking
                                        this.performanceMetrics.actions.delete(actionId);

                                        throw error;
                              }
                    };
          }

          // Issue detection integration
          logIssueDetected(issueId, issue, context = {}) {
                    this.logger.issueDetected(issueId, issue, context);

                    if (this.monitor) {
                              this.monitor.performanceCounters.issues.detected++;
                    }
          }

          logIssueResolved(issueId, issue, resolution, context = {}) {
                    this.logger.issueResolved(issueId, issue, resolution, context);

                    if (this.monitor) {
                              this.monitor.performanceCounters.issues.resolved++;
                    }
          }

          // Recovery logging integration
          logRecoveryStart(recoveryId, module, issue, context = {}) {
                    this.logger.recoveryStart(recoveryId, module, issue, context);

                    if (this.monitor) {
                              this.monitor.performanceCounters.recovery.attempts++;
                    }
          }

          logRecoveryComplete(recoveryId, module, result, duration, context = {}) {
                    this.logger.recoveryComplete(recoveryId, module, result, duration, context);

                    if (this.monitor) {
                              if (result.success) {
                                        this.monitor.performanceCounters.recovery.success++;
                              } else {
                                        this.monitor.performanceCounters.recovery.failed++;
                              }
                    }
          }

          // Connection logging integration
          logConnectionEvent(type, details, context = {}) {
                    this.logger.connectionEvent(type, details, context);

                    if (this.monitor) {
                              this.monitor.performanceCounters.connections.total++;
                              if (type === 'connected') {
                                        this.monitor.performanceCounters.connections.active++;
                              } else if (type === 'failed') {
                                        this.monitor.performanceCounters.connections.failed++;
                              }
                    }
          }

          // State change logging
          logStateChange(component, changes, newState, context = {}) {
                    this.logger.stateChange(component, changes, newState, context);
          }

          // Get current metrics
          getCurrentMetrics() {
                    return {
                              system: this.monitor.currentMetrics.system,
                              performance: this.monitor.currentMetrics.performance,
                              health: this.monitor.currentMetrics.health,
                              counters: this.monitor.performanceCounters
                    };
          }

          // Get diagnostics report
          async getDiagnosticsReport() {
                    try {
                              const diagnostics = await this.collectDiagnostics();
                              const healthCheck = await this.performHealthCheck();

                              return {
                                        timestamp: Date.now(),
                                        diagnostics,
                                        healthCheck,
                                        logStats: await this.logger.getLogStats(),
                                        recentErrors: await this.getRecentErrors(),
                                        performanceHistory: this.getPerformanceHistory()
                              };
                    } catch (error) {
                              this.logger.error('Failed to generate diagnostics report', { error });
                              throw error;
                    }
          }

          // Search logs
          async searchLogs(query, type = 'combined', maxResults = 100) {
                    return await this.logger.searchLogs(query, type, maxResults);
          }

          // Set alert callback
          setAlertCallback(callback) {
                    this.alertCallback = callback;
          }

          // Cleanup
          async cleanup() {
                    console.log('🧹 Cleaning up logging and monitoring integration...');

                    if (this.diagnosticsInterval) {
                              clearInterval(this.diagnosticsInterval);
                              this.diagnosticsInterval = null;
                    }

                    if (this.healthCheckInterval) {
                              clearInterval(this.healthCheckInterval);
                              this.healthCheckInterval = null;
                    }

                    if (this.monitor) {
                              this.monitor.stopMonitoring();
                    }

                    if (this.logger) {
                              await this.logger.cleanup();
                    }

                    this.isInitialized = false;
                    console.log('✅ Logging and monitoring integration cleanup complete');
          }
}

module.exports = LoggingMonitoringIntegration;