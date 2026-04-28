/**
 * Diagnostic Report Generator
 * Comprehensive system diagnostics and troubleshooting reports
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class DiagnosticsGenerator {
    constructor(logger, monitor, options = {}) {
        this.logger = logger;
        this.monitor = monitor;
        this.reportDir = options.reportDir || path.join(__dirname, 'reports');
        this.maxReports = options.maxReports || 50;
        
        console.log('🔍 Diagnostics Generator initialized');
    }

    async initialize() {
        try {
            // Create reports directory if it doesn't exist
            await fs.mkdir(this.reportDir, { recursive: true });
            console.log('📁 Reports directory initialized:', this.reportDir);
        } catch (error) {
            console.error('❌ Failed to initialize diagnostics:', error);
        }
    }

    async generateFullReport(includeSystemInfo = true, includeLogs = true, includeMetrics = true) {
        try {
            const timestamp = new Date().toISOString();
            const reportId = `diagnostic-${Date.now()}`;
            
            console.log(`🔍 Generating full diagnostic report: ${reportId}`);
            
            const report = {
                id: reportId,
                timestamp,
                version: '1.0.0',
                sections: {}
            };

            // System Information
            if (includeSystemInfo) {
                report.sections.systemInfo = await this.collectSystemInfo();
            }

            // Application Status
            report.sections.applicationStatus = await this.collectApplicationStatus();

            // Performance Metrics
            if (includeMetrics) {
                report.sections.metrics = await this.collectMetrics();
            }

            // Recent Logs
            if (includeLogs) {
                report.sections.logs = await this.collectRecentLogs();
            }

            // Issue Analysis
            report.sections.issueAnalysis = await this.analyzeIssues();

            // Recommendations
            report.sections.recommendations = await this.generateRecommendations(report);

            // Save report to file
            const reportPath = await this.saveReport(report);
            
            this.logger.info('Diagnostic report generated', {
                type: 'diagnostics',
                reportId,
                reportPath,
                sections: Object.keys(report.sections)
            });

            return {
                success: true,
                reportId,
                reportPath,
                report
            };

        } catch (error) {
            this.logger.error('Failed to generate diagnostic report', { error });
            return {
                success: false,
                error: error.message
            };
        }
    }

    async collectSystemInfo() {
        const cpus = os.cpus();
        const networkInterfaces = os.networkInterfaces();
        
        return {
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
            release: os.release(),
            version: os.version(),
            uptime: os.uptime(),
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            cpus: {
                count: cpus.length,
                model: cpus[0]?.model || 'Unknown',
                speed: cpus[0]?.speed || 0
            },
            loadAverage: os.loadavg(),
            networkInterfaces: Object.keys(networkInterfaces),
            userInfo: os.userInfo(),
            tmpdir: os.tmpdir(),
            homedir: os.homedir(),
            process: {
                pid: process.pid,
                version: process.version,
                platform: process.platform,
                arch: process.arch,
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage(),
                cwd: process.cwd(),
                execPath: process.execPath,
                argv: process.argv
            }
        };
    }

    async collectApplicationStatus() {
        const monitorStatus = this.monitor.getStatus();
        
        return {
            monitoring: {
                isActive: monitorStatus.isMonitoring,
                uptime: monitorStatus.uptime,
                metricsCount: monitorStatus.metricsCount
            },
            health: monitorStatus.currentMetrics.health,
            performance: monitorStatus.currentMetrics.performance,
            counters: monitorStatus.counters,
            lastMetricsCollection: monitorStatus.currentMetrics.system ? 'Recent' : 'None'
        };
    }

    async collectMetrics() {
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        
        return {
            system: {
                recent: this.monitor.getMetrics('system', oneHourAgo, now),
                summary: this.summarizeSystemMetrics()
            },
            performance: {
                recent: this.monitor.getMetrics('performance', oneHourAgo, now),
                summary: this.summarizePerformanceMetrics()
            }
        };
    }

    summarizeSystemMetrics() {
        const recentMetrics = this.monitor.getMetrics('system').slice(-20); // Last 20 collections
        
        if (recentMetrics.length === 0) {
            return { message: 'No system metrics available' };
        }

        const cpuUsages = recentMetrics.map(m => m.cpuUsage).filter(cpu => cpu !== undefined);
        const memoryUsages = recentMetrics.map(m => m.memoryUsage?.percentage).filter(mem => mem !== undefined);

        return {
            cpu: {
                average: cpuUsages.length > 0 ? Math.round(cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length) : 0,
                max: cpuUsages.length > 0 ? Math.max(...cpuUsages) : 0,
                min: cpuUsages.length > 0 ? Math.min(...cpuUsages) : 0
            },
            memory: {
                average: memoryUsages.length > 0 ? Math.round(memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length) : 0,
                max: memoryUsages.length > 0 ? Math.max(...memoryUsages) : 0,
                min: memoryUsages.length > 0 ? Math.min(...memoryUsages) : 0
            },
            dataPoints: recentMetrics.length
        };
    }

    summarizePerformanceMetrics() {
        const recentMetrics = this.monitor.getMetrics('performance').slice(-20); // Last 20 collections
        
        if (recentMetrics.length === 0) {
            return { message: 'No performance metrics available' };
        }

        const responseTimes = recentMetrics.map(m => m.averageResponseTime).filter(rt => rt !== undefined);
        const requestRates = recentMetrics.map(m => m.rates?.requests).filter(rr => rr !== undefined);

        return {
            responseTime: {
                average: responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0,
                max: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
                min: responseTimes.length > 0 ? Math.min(...responseTimes) : 0
            },
            requestRate: {
                average: requestRates.length > 0 ? Math.round(requestRates.reduce((a, b) => a + b, 0) / requestRates.length) : 0,
                max: requestRates.length > 0 ? Math.max(...requestRates) : 0,
                min: requestRates.length > 0 ? Math.min(...requestRates) : 0
            },
            dataPoints: recentMetrics.length
        };
    }

    async collectRecentLogs() {
        try {
            const logs = {
                combined: await this.logger.getRecentLogs('combined', 50),
                errors: await this.logger.getRecentLogs('error', 20),
                performance: await this.logger.getRecentLogs('performance', 20),
                security: await this.logger.getRecentLogs('security', 10)
            };

            // Count log levels
            const logLevelCounts = {};
            logs.combined.forEach(log => {
                const level = log.level || 'UNKNOWN';
                logLevelCounts[level] = (logLevelCounts[level] || 0) + 1;
            });

            return {
                ...logs,
                summary: {
                    totalEntries: logs.combined.length,
                    errorCount: logs.errors.length,
                    levelCounts: logLevelCounts,
                    timeRange: logs.combined.length > 0 ? {
                        oldest: logs.combined[0]?.timestamp,
                        newest: logs.combined[logs.combined.length - 1]?.timestamp
                    } : null
                }
            };
        } catch (error) {
            this.logger.error('Failed to collect recent logs for diagnostics', { error });
            return {
                error: 'Failed to collect logs',
                message: error.message
            };
        }
    }

    async analyzeIssues() {
        const issues = [];
        const warnings = [];
        const info = [];

        // Analyze current health
        const health = this.monitor.currentMetrics.health;
        if (health) {
            if (health.status === 'critical' || health.status === 'error') {
                issues.push({
                    type: 'health',
                    severity: 'high',
                    message: `System health is ${health.status} (score: ${health.score})`,
                    details: health.issues
                });
            } else if (health.status === 'warning') {
                warnings.push({
                    type: 'health',
                    severity: 'medium',
                    message: `System health shows warnings (score: ${health.score})`,
                    details: health.issues
                });
            }
        }

        // Analyze system metrics
        const systemMetrics = this.monitor.currentMetrics.system;
        if (systemMetrics) {
            if (systemMetrics.cpuUsage > 90) {
                issues.push({
                    type: 'cpu',
                    severity: 'high',
                    message: `Critical CPU usage: ${systemMetrics.cpuUsage}%`,
                    recommendation: 'Consider reducing system load or upgrading hardware'
                });
            } else if (systemMetrics.cpuUsage > 80) {
                warnings.push({
                    type: 'cpu',
                    severity: 'medium',
                    message: `High CPU usage: ${systemMetrics.cpuUsage}%`,
                    recommendation: 'Monitor CPU usage and consider optimization'
                });
            }

            if (systemMetrics.memoryUsage?.percentage > 95) {
                issues.push({
                    type: 'memory',
                    severity: 'high',
                    message: `Critical memory usage: ${systemMetrics.memoryUsage.percentage}%`,
                    recommendation: 'Free up memory or add more RAM'
                });
            } else if (systemMetrics.memoryUsage?.percentage > 85) {
                warnings.push({
                    type: 'memory',
                    severity: 'medium',
                    message: `High memory usage: ${systemMetrics.memoryUsage.percentage}%`,
                    recommendation: 'Monitor memory usage and consider cleanup'
                });
            }
        }

        // Analyze performance metrics
        const perfMetrics = this.monitor.currentMetrics.performance;
        if (perfMetrics) {
            if (perfMetrics.successRates?.requests < 90) {
                issues.push({
                    type: 'reliability',
                    severity: 'high',
                    message: `Low request success rate: ${perfMetrics.successRates.requests}%`,
                    recommendation: 'Investigate error causes and improve error handling'
                });
            } else if (perfMetrics.successRates?.requests < 95) {
                warnings.push({
                    type: 'reliability',
                    severity: 'medium',
                    message: `Moderate request success rate: ${perfMetrics.successRates.requests}%`,
                    recommendation: 'Monitor error patterns and consider improvements'
                });
            }

            if (perfMetrics.averageResponseTime > 5000) {
                issues.push({
                    type: 'performance',
                    severity: 'high',
                    message: `High response time: ${perfMetrics.averageResponseTime}ms`,
                    recommendation: 'Optimize performance or investigate bottlenecks'
                });
            } else if (perfMetrics.averageResponseTime > 2000) {
                warnings.push({
                    type: 'performance',
                    severity: 'medium',
                    message: `Elevated response time: ${perfMetrics.averageResponseTime}ms`,
                    recommendation: 'Consider performance optimization'
                });
            }
        }

        // Add informational items
        info.push({
            type: 'monitoring',
            message: `System monitoring is ${this.monitor.isMonitoring ? 'active' : 'inactive'}`,
            details: this.monitor.isMonitoring ? 'Collecting metrics normally' : 'Monitoring is not running'
        });

        return {
            issues,
            warnings,
            info,
            summary: {
                totalIssues: issues.length,
                totalWarnings: warnings.length,
                overallStatus: issues.length > 0 ? 'critical' : warnings.length > 0 ? 'warning' : 'healthy'
            }
        };
    }

    async generateRecommendations(report) {
        const recommendations = [];

        // System recommendations
        const systemInfo = report.sections.systemInfo;
        if (systemInfo) {
            const memoryUsagePercent = ((systemInfo.totalMemory - systemInfo.freeMemory) / systemInfo.totalMemory) * 100;
            
            if (memoryUsagePercent > 85) {
                recommendations.push({
                    category: 'system',
                    priority: 'high',
                    title: 'Memory Usage Optimization',
                    description: 'System memory usage is high. Consider freeing up memory or adding more RAM.',
                    actions: [
                        'Close unnecessary applications',
                        'Restart the application to free up memory leaks',
                        'Consider upgrading system memory'
                    ]
                });
            }

            if (systemInfo.process.uptime > 7 * 24 * 60 * 60) { // 7 days
                recommendations.push({
                    category: 'maintenance',
                    priority: 'medium',
                    title: 'Application Restart',
                    description: 'Application has been running for a long time. Consider restarting for optimal performance.',
                    actions: [
                        'Schedule a maintenance restart',
                        'Monitor for memory leaks',
                        'Check for application updates'
                    ]
                });
            }
        }

        // Performance recommendations
        const issueAnalysis = report.sections.issueAnalysis;
        if (issueAnalysis && issueAnalysis.issues.length > 0) {
            recommendations.push({
                category: 'performance',
                priority: 'high',
                title: 'Address Critical Issues',
                description: `${issueAnalysis.issues.length} critical issues detected that need immediate attention.`,
                actions: issueAnalysis.issues.map(issue => issue.recommendation || issue.message)
            });
        }

        // Monitoring recommendations
        if (!this.monitor.isMonitoring) {
            recommendations.push({
                category: 'monitoring',
                priority: 'high',
                title: 'Enable System Monitoring',
                description: 'System monitoring is not active. Enable monitoring for better system visibility.',
                actions: [
                    'Start system monitoring',
                    'Configure monitoring intervals',
                    'Set up alerting thresholds'
                ]
            });
        }

        // Log management recommendations
        const logs = report.sections.logs;
        if (logs && logs.summary.errorCount > 10) {
            recommendations.push({
                category: 'logging',
                priority: 'medium',
                title: 'Review Error Logs',
                description: `${logs.summary.errorCount} errors found in recent logs. Review and address recurring issues.`,
                actions: [
                    'Review error log patterns',
                    'Fix recurring errors',
                    'Improve error handling'
                ]
            });
        }

        return {
            recommendations,
            summary: {
                total: recommendations.length,
                highPriority: recommendations.filter(r => r.priority === 'high').length,
                mediumPriority: recommendations.filter(r => r.priority === 'medium').length,
                lowPriority: recommendations.filter(r => r.priority === 'low').length
            }
        };
    }

    async saveReport(report) {
        try {
            const filename = `${report.id}.json`;
            const filepath = path.join(this.reportDir, filename);
            
            await fs.writeFile(filepath, JSON.stringify(report, null, 2));
            
            // Clean up old reports
            await this.cleanupOldReports();
            
            return filepath;
        } catch (error) {
            this.logger.error('Failed to save diagnostic report', { error });
            throw error;
        }
    }

    async cleanupOldReports() {
        try {
            const files = await fs.readdir(this.reportDir);
            const reportFiles = files.filter(f => f.startsWith('diagnostic-') && f.endsWith('.json'));
            
            if (reportFiles.length > this.maxReports) {
                // Sort by creation time (embedded in filename)
                reportFiles.sort();
                
                // Delete oldest files
                const filesToDelete = reportFiles.slice(0, reportFiles.length - this.maxReports);
                
                for (const file of filesToDelete) {
                    await fs.unlink(path.join(this.reportDir, file));
                    console.log(`🗑️ Deleted old report: ${file}`);
                }
            }
        } catch (error) {
            this.logger.error('Failed to cleanup old reports', { error });
        }
    }

    async getReportList() {
        try {
            const files = await fs.readdir(this.reportDir);
            const reportFiles = files.filter(f => f.startsWith('diagnostic-') && f.endsWith('.json'));
            
            const reports = [];
            for (const file of reportFiles) {
                try {
                    const filepath = path.join(this.reportDir, file);
                    const stats = await fs.stat(filepath);
                    const content = await fs.readFile(filepath, 'utf8');
                    const report = JSON.parse(content);
                    
                    reports.push({
                        id: report.id,
                        timestamp: report.timestamp,
                        filename: file,
                        size: stats.size,
                        sections: Object.keys(report.sections || {})
                    });
                } catch (error) {
                    console.warn(`⚠️ Failed to read report ${file}:`, error.message);
                }
            }
            
            // Sort by timestamp (newest first)
            reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            return reports;
        } catch (error) {
            this.logger.error('Failed to get report list', { error });
            return [];
        }
    }

    async getReport(reportId) {
        try {
            const filename = `${reportId}.json`;
            const filepath = path.join(this.reportDir, filename);
            
            const content = await fs.readFile(filepath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            this.logger.error('Failed to get report', { error, reportId });
            return null;
        }
    }

    async deleteReport(reportId) {
        try {
            const filename = `${reportId}.json`;
            const filepath = path.join(this.reportDir, filename);
            
            await fs.unlink(filepath);
            
            this.logger.info('Diagnostic report deleted', { reportId });
            return true;
        } catch (error) {
            this.logger.error('Failed to delete report', { error, reportId });
            return false;
        }
    }

    // Generate quick health check
    async generateHealthCheck() {
        const health = this.monitor.currentMetrics.health;
        const system = this.monitor.currentMetrics.system;
        const performance = this.monitor.currentMetrics.performance;
        
        return {
            timestamp: new Date().toISOString(),
            status: health?.status || 'unknown',
            score: health?.score || 0,
            issues: health?.issues || [],
            system: {
                cpu: system?.cpuUsage || 0,
                memory: system?.memoryUsage?.percentage || 0,
                uptime: system?.uptime || 0
            },
            performance: {
                responseTime: performance?.averageResponseTime || 0,
                requestSuccessRate: performance?.successRates?.requests || 100,
                actionSuccessRate: performance?.successRates?.actions || 100
            },
            monitoring: {
                active: this.monitor.isMonitoring,
                uptime: Date.now() - this.monitor.startTime
            }
        };
    }

    // Cleanup
    async cleanup() {
        console.log('🧹 Cleaning up diagnostics...');
        // Cleanup is handled by individual methods
    }
}

module.exports = DiagnosticsGenerator;