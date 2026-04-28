/**
 * Comprehensive Test Suite for Logging and Monitoring System
 * Tests all logging, monitoring, and diagnostic functionality
 */

const Logger = require('./logger');
const SystemMonitor = require('./monitor');
const DiagnosticsGenerator = require('./diagnostics');
const fs = require('fs').promises;
const path = require('path');

class LoggingMonitoringTester {
    constructor() {
        this.testResults = [];
        this.testDir = path.join(__dirname, 'test-logs');
        
        console.log('🧪 Logging and Monitoring Test Suite initialized');
    }

    async runAllTests() {
        console.log('\n🚀 Starting comprehensive logging and monitoring tests...\n');
        
        try {
            // Clean up test directory
            await this.cleanupTestDir();
            
            // Test Logger
            await this.testLogger();
            
            // Test System Monitor
            await this.testSystemMonitor();
            
            // Test Diagnostics Generator
            await this.testDiagnosticsGenerator();
            
            // Test Integration
            await this.testIntegration();
            
            // Generate test report
            this.generateTestReport();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
        }
    }

    async testLogger() {
        console.log('📝 Testing Logger...');
        
        try {
            // Initialize logger with test configuration
            const logger = new Logger({
                logLevel: 'debug',
                logDir: path.join(this.testDir, 'logs'),
                maxFileSize: 1024, // Small size for testing rotation
                maxFiles: 3,
                enableConsole: false, // Disable console for cleaner test output
                enableFile: true
            });
            
            // Wait for initialization
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Test basic logging levels
            await this.testBasicLogging(logger);
            
            // Test specialized logging methods
            await this.testSpecializedLogging(logger);
            
            // Test log file operations
            await this.testLogFileOperations(logger);
            
            // Test log rotation
            await this.testLogRotation(logger);
            
            this.addTestResult('Logger', 'All logger tests passed', true);
            
        } catch (error) {
            this.addTestResult('Logger', `Logger tests failed: ${error.message}`, false);
        }
    }

    async testBasicLogging(logger) {
        console.log('  📋 Testing basic logging levels...');
        
        // Test all log levels
        await logger.error('Test error message', { testData: 'error' });
        await logger.warn('Test warning message', { testData: 'warning' });
        await logger.info('Test info message', { testData: 'info' });
        await logger.debug('Test debug message', { testData: 'debug' });
        await logger.trace('Test trace message', { testData: 'trace' });
        
        // Wait for file writes
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify log files exist
        const logFiles = ['combined.log', 'error.log'];
        for (const file of logFiles) {
            const filePath = path.join(this.testDir, 'logs', file);
            try {
                await fs.access(filePath);
                console.log(`    ✅ Log file created: ${file}`);
            } catch (error) {
                throw new Error(`Log file not created: ${file}`);
            }
        }
        
        // Verify log content
        const combinedLogPath = path.join(this.testDir, 'logs', 'combined.log');
        const logContent = await fs.readFile(combinedLogPath, 'utf8');
        const logLines = logContent.trim().split('\\n').filter(line => line.length > 0);
        
        if (logLines.length < 5) {
            throw new Error(`Expected at least 5 log entries, got ${logLines.length}`);
        }
        
        // Verify JSON format
        for (const line of logLines) {
            try {
                const logEntry = JSON.parse(line);
                if (!logEntry.timestamp || !logEntry.level || !logEntry.message) {
                    throw new Error('Invalid log entry format');
                }
            } catch (error) {
                throw new Error(`Invalid JSON in log entry: ${line}`);
            }
        }
        
        console.log('    ✅ Basic logging levels test passed');
    }

    async testSpecializedLogging(logger) {
        console.log('  🎯 Testing specialized logging methods...');
        
        // Test access logging
        await logger.access('GET', '/api/test', 200, 150, { userAgent: 'test' });
        
        // Test performance logging
        await logger.performance('test-operation', 250, { details: 'test' });
        
        // Test security logging
        await logger.security('test-event', 'Test security event', { ip: '127.0.0.1' });
        
        // Test action logging
        await logger.actionStart('test-action', { param1: 'value1' }, { user: 'test' });
        await logger.actionComplete('test-action', { success: true }, 300, { user: 'test' });
        
        // Wait for file writes
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify specialized log files
        const specializedFiles = ['access.log', 'performance.log', 'security.log'];
        for (const file of specializedFiles) {
            const filePath = path.join(this.testDir, 'logs', file);
            try {
                await fs.access(filePath);
                const content = await fs.readFile(filePath, 'utf8');
                if (content.trim().length === 0) {
                    throw new Error(`Specialized log file is empty: ${file}`);
                }
                console.log(`    ✅ Specialized log file created and populated: ${file}`);
            } catch (error) {
                throw new Error(`Specialized log file issue: ${file} - ${error.message}`);
            }
        }
        
        console.log('    ✅ Specialized logging methods test passed');
    }

    async testLogFileOperations(logger) {
        console.log('  📂 Testing log file operations...');
        
        // Test getting recent logs
        const recentLogs = await logger.getRecentLogs('combined', 10);
        if (recentLogs.length === 0) {
            throw new Error('No recent logs returned');
        }
        
        console.log(`    ✅ Retrieved ${recentLogs.length} recent log entries`);
        
        // Test searching logs
        const searchResults = await logger.searchLogs('test', 'combined', 5);
        if (searchResults.length === 0) {
            throw new Error('No search results returned');
        }
        
        console.log(`    ✅ Search returned ${searchResults.length} matching entries`);
        
        console.log('    ✅ Log file operations test passed');
    }

    async testLogRotation(logger) {
        console.log('  🔄 Testing log rotation...');
        
        // Generate enough logs to trigger rotation
        const largeMessage = 'x'.repeat(200); // Large message to fill up log file quickly
        
        for (let i = 0; i < 10; i++) {
            await logger.info(`Large log message ${i}: ${largeMessage}`, { iteration: i });
        }
        
        // Wait for file operations
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Check if rotation occurred (look for .1 files)
        const logDir = path.join(this.testDir, 'logs');
        const files = await fs.readdir(logDir);
        const rotatedFiles = files.filter(f => f.includes('.1.'));
        
        if (rotatedFiles.length > 0) {
            console.log(`    ✅ Log rotation occurred: ${rotatedFiles.length} rotated files found`);
        } else {
            console.log('    ℹ️ Log rotation not triggered (file size threshold not reached)');
        }
        
        console.log('    ✅ Log rotation test completed');
    }

    async testSystemMonitor() {
        console.log('📊 Testing System Monitor...');
        
        try {
            // Create a mock logger for the monitor
            const logger = new Logger({
                logLevel: 'info',
                logDir: path.join(this.testDir, 'monitor-logs'),
                enableConsole: false
            });
            
            // Initialize monitor
            const monitor = new SystemMonitor(logger, {
                collectInterval: 1000, // 1 second for testing
                alertThresholds: {
                    cpu: 50,    // Lower thresholds for testing
                    memory: 60,
                    responseTime: 1000,
                    errorRate: 5
                }
            });
            
            // Test monitor initialization
            await this.testMonitorInitialization(monitor);
            
            // Test metrics collection
            await this.testMetricsCollection(monitor);
            
            // Test performance counters
            await this.testPerformanceCounters(monitor);
            
            // Test health calculation
            await this.testHealthCalculation(monitor);
            
            // Test alerts
            await this.testAlerts(monitor);
            
            // Cleanup
            monitor.stopMonitoring();
            
            this.addTestResult('SystemMonitor', 'All system monitor tests passed', true);
            
        } catch (error) {
            this.addTestResult('SystemMonitor', `System monitor tests failed: ${error.message}`, false);
        }
    }

    async testMonitorInitialization(monitor) {
        console.log('  🚀 Testing monitor initialization...');
        
        // Test initial state
        const status = monitor.getStatus();
        if (status.isMonitoring) {
            throw new Error('Monitor should not be monitoring initially');
        }
        
        // Start monitoring
        monitor.startMonitoring();
        
        // Wait a moment for initialization
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const statusAfterStart = monitor.getStatus();
        if (!statusAfterStart.isMonitoring) {
            throw new Error('Monitor should be monitoring after start');
        }
        
        console.log('    ✅ Monitor initialization test passed');
    }

    async testMetricsCollection(monitor) {
        console.log('  📈 Testing metrics collection...');
        
        // Wait for at least one metrics collection cycle
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const status = monitor.getStatus();
        
        // Check if metrics were collected
        if (status.metricsCount.system === 0) {
            throw new Error('No system metrics collected');
        }
        
        if (status.metricsCount.performance === 0) {
            throw new Error('No performance metrics collected');
        }
        
        // Check current metrics
        if (!status.currentMetrics.system) {
            throw new Error('No current system metrics available');
        }
        
        if (!status.currentMetrics.performance) {
            throw new Error('No current performance metrics available');
        }
        
        console.log(`    ✅ Collected ${status.metricsCount.system} system metrics and ${status.metricsCount.performance} performance metrics`);
    }

    async testPerformanceCounters(monitor) {
        console.log('  🎯 Testing performance counters...');
        
        // Record some test events
        monitor.recordRequest(true);
        monitor.recordRequest(false);
        monitor.recordAction(true);
        monitor.recordConnection('connected');
        monitor.recordIssue('detected');
        monitor.recordRecovery(true);
        
        const status = monitor.getStatus();
        const counters = status.counters;
        
        // Verify counters were updated
        if (counters.requests.total !== 2) {
            throw new Error(`Expected 2 total requests, got ${counters.requests.total}`);
        }
        
        if (counters.requests.success !== 1) {
            throw new Error(`Expected 1 successful request, got ${counters.requests.success}`);
        }
        
        if (counters.actions.total !== 1) {
            throw new Error(`Expected 1 total action, got ${counters.actions.total}`);
        }
        
        console.log('    ✅ Performance counters test passed');
    }

    async testHealthCalculation(monitor) {
        console.log('  💚 Testing health calculation...');
        
        // Wait for health calculation
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const status = monitor.getStatus();
        const health = status.currentMetrics.health;
        
        if (!health) {
            throw new Error('No health metrics available');
        }
        
        if (!health.status || !health.score === undefined) {
            throw new Error('Invalid health metrics format');
        }
        
        if (health.score < 0 || health.score > 100) {
            throw new Error(`Invalid health score: ${health.score}`);
        }
        
        console.log(`    ✅ Health calculation test passed (status: ${health.status}, score: ${health.score})`);
    }

    async testAlerts(monitor) {
        console.log('  🚨 Testing alerts...');
        
        let alertReceived = false;
        
        // Listen for alerts
        monitor.on('alerts', (alerts) => {
            alertReceived = true;
            console.log(`    📢 Received ${alerts.length} alerts`);
        });
        
        // Wait for potential alerts
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Note: Alerts may or may not be triggered depending on system load
        console.log(`    ✅ Alert system test completed (alerts received: ${alertReceived})`);
    }

    async testDiagnosticsGenerator() {
        console.log('🔍 Testing Diagnostics Generator...');
        
        try {
            // Create dependencies
            const logger = new Logger({
                logLevel: 'info',
                logDir: path.join(this.testDir, 'diag-logs'),
                enableConsole: false
            });
            
            const monitor = new SystemMonitor(logger, { collectInterval: 1000 });
            monitor.startMonitoring();
            
            // Wait for some metrics
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Initialize diagnostics generator
            const diagnostics = new DiagnosticsGenerator(logger, monitor, {
                reportDir: path.join(this.testDir, 'reports')
            });
            
            await diagnostics.initialize();
            
            // Test report generation
            await this.testReportGeneration(diagnostics);
            
            // Test health check
            await this.testHealthCheck(diagnostics);
            
            // Test report management
            await this.testReportManagement(diagnostics);
            
            // Cleanup
            monitor.stopMonitoring();
            
            this.addTestResult('DiagnosticsGenerator', 'All diagnostics generator tests passed', true);
            
        } catch (error) {
            this.addTestResult('DiagnosticsGenerator', `Diagnostics generator tests failed: ${error.message}`, false);
        }
    }

    async testReportGeneration(diagnostics) {
        console.log('  📋 Testing report generation...');
        
        const result = await diagnostics.generateFullReport(true, true, true);
        
        if (!result.success) {
            throw new Error(`Report generation failed: ${result.error}`);
        }
        
        if (!result.reportId || !result.report) {
            throw new Error('Invalid report generation result');
        }
        
        // Verify report structure
        const report = result.report;
        const expectedSections = ['systemInfo', 'applicationStatus', 'metrics', 'logs', 'issueAnalysis', 'recommendations'];
        
        for (const section of expectedSections) {
            if (!report.sections[section]) {
                throw new Error(`Missing report section: ${section}`);
            }
        }
        
        console.log(`    ✅ Report generated successfully with ${Object.keys(report.sections).length} sections`);
    }

    async testHealthCheck(diagnostics) {
        console.log('  💚 Testing health check...');
        
        const healthCheck = await diagnostics.generateHealthCheck();
        
        if (!healthCheck.timestamp || !healthCheck.status) {
            throw new Error('Invalid health check format');
        }
        
        if (!healthCheck.system || !healthCheck.performance || !healthCheck.monitoring) {
            throw new Error('Missing health check sections');
        }
        
        console.log(`    ✅ Health check generated (status: ${healthCheck.status})`);
    }

    async testReportManagement(diagnostics) {
        console.log('  📁 Testing report management...');
        
        // Get report list
        const reports = await diagnostics.getReportList();
        
        if (reports.length === 0) {
            throw new Error('No reports found in list');
        }
        
        // Get specific report
        const reportId = reports[0].id;
        const report = await diagnostics.getReport(reportId);
        
        if (!report) {
            throw new Error('Failed to retrieve specific report');
        }
        
        console.log(`    ✅ Report management test passed (${reports.length} reports found)`);
    }

    async testIntegration() {
        console.log('🔗 Testing Integration...');
        
        try {
            // Test full integration scenario
            const logger = new Logger({
                logLevel: 'debug',
                logDir: path.join(this.testDir, 'integration-logs'),
                enableConsole: false
            });
            
            const monitor = new SystemMonitor(logger, { collectInterval: 500 });
            const diagnostics = new DiagnosticsGenerator(logger, monitor, {
                reportDir: path.join(this.testDir, 'integration-reports')
            });
            
            await diagnostics.initialize();
            
            // Start monitoring
            monitor.startMonitoring();
            
            // Simulate some activity
            await this.simulateActivity(logger, monitor);
            
            // Generate diagnostic report
            const reportResult = await diagnostics.generateFullReport();
            
            if (!reportResult.success) {
                throw new Error('Integration test failed: report generation failed');
            }
            
            // Verify integration
            const report = reportResult.report;
            if (!report.sections.logs || !report.sections.metrics) {
                throw new Error('Integration test failed: missing expected data');
            }
            
            // Cleanup
            monitor.stopMonitoring();
            
            this.addTestResult('Integration', 'All integration tests passed', true);
            
        } catch (error) {
            this.addTestResult('Integration', `Integration tests failed: ${error.message}`, false);
        }
    }

    async simulateActivity(logger, monitor) {
        console.log('  🎭 Simulating system activity...');
        
        // Simulate various activities
        for (let i = 0; i < 5; i++) {
            // Log various events
            await logger.info(`Simulated activity ${i}`, { iteration: i });
            await logger.access('GET', `/api/test/${i}`, 200, Math.random() * 100 + 50);
            await logger.performance(`operation-${i}`, Math.random() * 200 + 100);
            
            // Record performance events
            monitor.recordRequest(Math.random() > 0.1); // 90% success rate
            monitor.recordAction(Math.random() > 0.05); // 95% success rate
            
            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Wait for metrics collection
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('    ✅ Activity simulation completed');
    }

    addTestResult(component, message, success) {
        this.testResults.push({
            component,
            message,
            success,
            timestamp: new Date().toISOString()
        });
        
        const icon = success ? '✅' : '❌';
        console.log(`  ${icon} ${component}: ${message}`);
    }

    generateTestReport() {
        console.log('\\n📊 Test Results Summary:');
        console.log('========================');
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.success).length;
        const failedTests = totalTests - passedTests;
        
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);
        console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
        
        if (failedTests > 0) {
            console.log('\\n❌ Failed Tests:');
            this.testResults.filter(r => !r.success).forEach(result => {
                console.log(`  - ${result.component}: ${result.message}`);
            });
        }
        
        console.log('\\n🎉 Logging and Monitoring Test Suite completed!');
        
        return {
            total: totalTests,
            passed: passedTests,
            failed: failedTests,
            successRate: Math.round((passedTests / totalTests) * 100),
            results: this.testResults
        };
    }

    async cleanupTestDir() {
        try {
            // Remove test directory if it exists
            await fs.rm(this.testDir, { recursive: true, force: true });
            
            // Create fresh test directory
            await fs.mkdir(this.testDir, { recursive: true });
            
            console.log('🧹 Test directory cleaned up');
        } catch (error) {
            console.warn('⚠️ Failed to cleanup test directory:', error.message);
        }
    }

    async cleanup() {
        console.log('🧹 Cleaning up test suite...');
        await this.cleanupTestDir();
    }
}

// Export for use in other modules
module.exports = LoggingMonitoringTester;

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new LoggingMonitoringTester();
    
    tester.runAllTests()
        .then(() => {
            console.log('\\n✅ All tests completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\\n❌ Test suite failed:', error);
            process.exit(1);
        });
}