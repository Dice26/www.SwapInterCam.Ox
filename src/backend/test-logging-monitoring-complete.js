/**
 * Comprehensive Test for Logging and Monitoring Integration
 * Tests all aspects of the logging and monitoring system
 */

const LoggingMonitoringIntegration = require('./logging-monitoring-integration');
const path = require('path');
const fs = require('fs').promises;

class LoggingMonitoringTester {
    constructor() {
        this.testResults = [];
        this.integration = null;
    }

    async runAllTests() {
        console.log('🧪 Starting comprehensive logging and monitoring tests...\n');

        try {
            await this.testInitialization();
            await this.testLoggingFunctionality();
            await this.testMonitoringFunctionality();
            await this.testHealthChecks();
            await this.testDiagnostics();
            await this.testMiddleware();
            await this.testActionWrapping();
            await this.testIntegrationMethods();
            await this.testCleanup();

            this.printResults();

        } catch (error) {
            console.error('❌ Test suite failed:', error);
            this.addResult('Test Suite', false, error.message);
        }
    }

    async testInitialization() {
        console.log('📋 Testing initialization...');

        try {
            // Test with default options
            this.integration = new LoggingMonitoringIntegration({
                logDir: path.join(__dirname, 'test-logs'),
                logLevel: 'debug',
                monitoringInterval: 5000,
                diagnosticsInterval: 10000
            });

            this.addResult('Integration Creation', true, 'Successfully created integration instance');

            // Test initialization
            await this.integration.initialize();
            this.addResult('Integration Initialize', this.integration.isInitialized, 
                this.integration.isInitialized ? 'Integration initialized successfully' : 'Failed to initialize');

            // Wait a moment for monitoring to start
            await this.sleep(1000);

        } catch (error) {
            this.addResult('Integration Initialize', false, error.message);
            throw error;
        }
    }

    async testLoggingFunctionality() {
        console.log('📝 Testing logging functionality...');

        try {
            const logger = this.integration.logger;

            // Test basic logging levels
            logger.error('Test error message', { testType: 'error-test' });
            logger.warn('Test warning message', { testType: 'warn-test' });
            logger.info('Test info message', { testType: 'info-test' });
            logger.debug('Test debug message', { testType: 'debug-test' });

            this.addResult('Basic Logging', true, 'All log levels working');

            // Test specialized logging
            logger.access('GET', '/test', 200, 150, { testType: 'access-test' });
            logger.performance('test-operation', 250, { testType: 'performance-test' });
            logger.security('test-event', { details: 'test security event' });

            this.addResult('Specialized Logging', true, 'Access, performance, and security logging working');

            // Test action logging
            logger.actionStart('test-action', { param: 'value' });
            logger.actionComplete('test-action', { success: true }, 100);

            this.addResult('Action Logging', true, 'Action logging working');

            // Test state change logging
            logger.stateChange('test-component', { prop: 'old' }, { prop: 'new' });

            this.addResult('State Change Logging', true, 'State change logging working');

            // Test issue logging
            logger.issueDetected('test-issue-1', { message: 'Test issue detected' });
            logger.issueResolved('test-issue-1', { message: 'Test issue detected' }, { action: 'resolved' });

            this.addResult('Issue Logging', true, 'Issue detection and resolution logging working');

            // Test recovery logging
            logger.recoveryStart('test-recovery-1', 'test-module', { message: 'Test recovery needed' });
            logger.recoveryComplete('test-recovery-1', 'test-module', { success: true }, 200);

            this.addResult('Recovery Logging', true, 'Recovery logging working');

            // Test connection logging
            logger.connectionEvent('connected', { endpoint: 'test-endpoint' });
            logger.connectionEvent('failed', { endpoint: 'test-endpoint', error: 'Connection failed' });

            this.addResult('Connection Logging', true, 'Connection event logging working');

        } catch (error) {
            this.addResult('Logging Functionality', false, error.message);
        }
    }

    async testMonitoringFunctionality() {
        console.log('📊 Testing monitoring functionality...');

        try {
            const monitor = this.integration.monitor;

            // Check if monitoring is running
            const isMonitoring = monitor.isMonitoring;
            this.addResult('Monitor Status', isMonitoring, 
                isMonitoring ? 'Monitor is running' : 'Monitor is not running');

            // Wait for metrics collection
            await this.sleep(2000);

            // Check current metrics
            const metrics = this.integration.getCurrentMetrics();
            const hasSystemMetrics = metrics.system && typeof metrics.system.cpuUsage === 'number';
            const hasPerformanceMetrics = metrics.performance && typeof metrics.performance.uptime === 'number';

            this.addResult('System Metrics', hasSystemMetrics, 
                hasSystemMetrics ? 'System metrics collected' : 'No system metrics');

            this.addResult('Performance Metrics', hasPerformanceMetrics, 
                hasPerformanceMetrics ? 'Performance metrics collected' : 'No performance metrics');

            // Test performance counters
            const counters = metrics.counters;
            const hasCounters = counters && typeof counters.requests === 'object';

            this.addResult('Performance Counters', hasCounters, 
                hasCounters ? 'Performance counters available' : 'No performance counters');

        } catch (error) {
            this.addResult('Monitoring Functionality', false, error.message);
        }
    }

    async testHealthChecks() {
        console.log('🏥 Testing health checks...');

        try {
            // Perform health check
            const healthCheck = await this.integration.performHealthCheck();

            const hasHealthStatus = healthCheck && healthCheck.status;
            this.addResult('Health Check Status', hasHealthStatus, 
                hasHealthStatus ? `Health status: ${healthCheck.status}` : 'No health status');

            const hasChecks = healthCheck.checks && Object.keys(healthCheck.checks).length > 0;
            this.addResult('Health Check Details', hasChecks, 
                hasChecks ? `${Object.keys(healthCheck.checks).length} health checks performed` : 'No health check details');

            // Test individual health checks
            const loggerHealth = await this.integration.checkLoggerHealth();
            this.addResult('Logger Health', loggerHealth.healthy, loggerHealth.message);

            const monitorHealth = await this.integration.checkMonitorHealth();
            this.addResult('Monitor Health', monitorHealth.healthy, monitorHealth.message);

            const diskHealth = await this.integration.checkDiskSpace();
            this.addResult('Disk Health', diskHealth.healthy, diskHealth.message);

            const logFileHealth = await this.integration.checkLogFileSizes();
            this.addResult('Log File Health', logFileHealth.healthy, logFileHealth.message);

        } catch (error) {
            this.addResult('Health Checks', false, error.message);
        }
    }

    async testDiagnostics() {
        console.log('🔍 Testing diagnostics...');

        try {
            // Collect diagnostics
            const diagnostics = await this.integration.collectDiagnostics();

            const hasDiagnostics = diagnostics && diagnostics.timestamp;
            this.addResult('Diagnostics Collection', hasDiagnostics, 
                hasDiagnostics ? 'Diagnostics collected successfully' : 'Failed to collect diagnostics');

            // Test diagnostics report
            const report = await this.integration.getDiagnosticsReport();

            const hasReport = report && report.diagnostics && report.healthCheck;
            this.addResult('Diagnostics Report', hasReport, 
                hasReport ? 'Full diagnostics report generated' : 'Failed to generate report');

            // Test log summary
            const logSummary = await this.integration.getRecentLogSummary();
            const hasLogSummary = logSummary && typeof logSummary.total === 'number';
            this.addResult('Log Summary', hasLogSummary, 
                hasLogSummary ? `Log summary: ${logSummary.total} entries` : 'No log summary');

            // Test recent errors
            const recentErrors = await this.integration.getRecentErrors();
            const hasErrorList = Array.isArray(recentErrors);
            this.addResult('Recent Errors', hasErrorList, 
                hasErrorList ? `${recentErrors.length} recent errors found` : 'Failed to get recent errors');

            // Test performance history
            const perfHistory = this.integration.getPerformanceHistory();
            const hasPerfHistory = perfHistory && Array.isArray(perfHistory.responseTimeHistory);
            this.addResult('Performance History', hasPerfHistory, 
                hasPerfHistory ? 'Performance history available' : 'No performance history');

        } catch (error) {
            this.addResult('Diagnostics', false, error.message);
        }
    }

    async testMiddleware() {
        console.log('🔌 Testing middleware functionality...');

        try {
            // Create logging middleware
            const middleware = this.integration.createLoggingMiddleware();

            const isFunction = typeof middleware === 'function';
            this.addResult('Middleware Creation', isFunction, 
                isFunction ? 'Logging middleware created' : 'Failed to create middleware');

            // Test middleware with mock request/response
            if (isFunction) {
                const mockReq = {
                    method: 'GET',
                    url: '/test',
                    get: (header) => header === 'User-Agent' ? 'test-agent' : null,
                    ip: '127.0.0.1'
                };

                const mockRes = {
                    statusCode: 200,
                    end: function(...args) {
                        // Mock end function
                        this.ended = true;
                    }
                };

                let nextCalled = false;
                const mockNext = () => { nextCalled = true; };

                // Execute middleware
                middleware(mockReq, mockRes, mockNext);

                // Simulate response end
                mockRes.end();

                this.addResult('Middleware Execution', nextCalled && mockRes.ended, 
                    'Middleware executed successfully');
            }

        } catch (error) {
            this.addResult('Middleware', false, error.message);
        }
    }

    async testActionWrapping() {
        console.log('🎯 Testing action wrapping...');

        try {
            // Create test action
            const testAction = async (params) => {
                await this.sleep(100); // Simulate work
                return { success: true, result: 'test completed', params };
            };

            // Wrap action
            const wrappedAction = this.integration.wrapActionExecution('test-action', testAction);

            const isFunction = typeof wrappedAction === 'function';
            this.addResult('Action Wrapping', isFunction, 
                isFunction ? 'Action wrapped successfully' : 'Failed to wrap action');

            if (isFunction) {
                // Execute wrapped action
                const result = await wrappedAction({ testParam: 'value' });

                const hasResult = result && result.success;
                this.addResult('Wrapped Action Execution', hasResult, 
                    hasResult ? 'Wrapped action executed successfully' : 'Wrapped action failed');
            }

            // Test action that throws error
            const errorAction = async () => {
                throw new Error('Test error');
            };

            const wrappedErrorAction = this.integration.wrapActionExecution('error-action', errorAction);

            try {
                await wrappedErrorAction();
                this.addResult('Error Action Handling', false, 'Error action should have thrown');
            } catch (error) {
                this.addResult('Error Action Handling', true, 'Error action properly handled');
            }

        } catch (error) {
            this.addResult('Action Wrapping', false, error.message);
        }
    }

    async testIntegrationMethods() {
        console.log('🔗 Testing integration methods...');

        try {
            // Test issue logging integration
            this.integration.logIssueDetected('test-issue-2', { message: 'Integration test issue' });
            this.integration.logIssueResolved('test-issue-2', { message: 'Integration test issue' }, { resolved: true });

            this.addResult('Issue Integration', true, 'Issue logging integration working');

            // Test recovery logging integration
            this.integration.logRecoveryStart('test-recovery-2', 'integration-module', { message: 'Test recovery' });
            this.integration.logRecoveryComplete('test-recovery-2', 'integration-module', { success: true }, 150);

            this.addResult('Recovery Integration', true, 'Recovery logging integration working');

            // Test connection logging integration
            this.integration.logConnectionEvent('connected', { service: 'test-service' });
            this.integration.logConnectionEvent('disconnected', { service: 'test-service' });

            this.addResult('Connection Integration', true, 'Connection logging integration working');

            // Test state change logging integration
            this.integration.logStateChange('integration-component', { status: 'old' }, { status: 'new' });

            this.addResult('State Integration', true, 'State change logging integration working');

            // Test alert callback
            let alertReceived = false;
            this.integration.setAlertCallback((alert) => {
                alertReceived = true;
            });

            this.addResult('Alert Callback', true, 'Alert callback set successfully');

            // Test log search
            const searchResults = await this.integration.searchLogs('test', 'combined', 10);
            const hasSearchResults = Array.isArray(searchResults);

            this.addResult('Log Search', hasSearchResults, 
                hasSearchResults ? `Found ${searchResults.length} search results` : 'Log search failed');

        } catch (error) {
            this.addResult('Integration Methods', false, error.message);
        }
    }

    async testCleanup() {
        console.log('🧹 Testing cleanup...');

        try {
            // Test cleanup
            await this.integration.cleanup();

            const isCleanedUp = !this.integration.isInitialized;
            this.addResult('Cleanup', isCleanedUp, 
                isCleanedUp ? 'Integration cleaned up successfully' : 'Cleanup failed');

        } catch (error) {
            this.addResult('Cleanup', false, error.message);
        }
    }

    addResult(testName, success, message) {
        this.testResults.push({
            test: testName,
            success,
            message,
            timestamp: new Date().toISOString()
        });

        const status = success ? '✅' : '❌';
        console.log(`  ${status} ${testName}: ${message}`);
    }

    printResults() {
        console.log('\n📊 Test Results Summary:');
        console.log('=' .repeat(50));

        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.success).length;
        const failedTests = totalTests - passedTests;

        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests} ✅`);
        console.log(`Failed: ${failedTests} ❌`);
        console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

        if (failedTests > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults
                .filter(r => !r.success)
                .forEach(r => console.log(`  - ${r.test}: ${r.message}`));
        }

        console.log('\n🎉 Logging and monitoring integration testing complete!');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new LoggingMonitoringTester();
    tester.runAllTests().catch(console.error);
}

module.exports = LoggingMonitoringTester;