/**
 * Test Script for Action Execution System
 * Tests all action execution functionality
 */

const ActionExecutor = require('./action-executor');
const StateManager = require('./state-manager');

// Mock recovery modules for testing
class MockRecoveryModule {
    constructor(name) {
        this.name = name;
        this.status = 'active';
    }

    canHandle(issue) {
        return issue.message.toLowerCase().includes(this.name);
    }

    async execute(context) {
        console.log(`🔧 Mock ${this.name} recovery executing for issue: ${context.issue.message}`);
        
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return {
            success: true,
            message: `${this.name} recovery completed`,
            details: `Resolved issue: ${context.issue.message}`,
            recoveryId: context.recoveryId
        };
    }

    getStatus() {
        return {
            name: this.name,
            status: this.status,
            lastExecution: Date.now()
        };
    }

    async scanDevices() {
        return {
            success: true,
            message: `${this.name} devices scanned`,
            devices: [
                { id: `${this.name}-1`, name: `Mock ${this.name} Device 1` },
                { id: `${this.name}-2`, name: `Mock ${this.name} Device 2` }
            ]
        };
    }

    async refreshState() {
        return {
            success: true,
            message: `${this.name} state refreshed`
        };
    }
}

class ActionExecutorTester {
    constructor() {
        this.stateManager = new StateManager(':memory:');
        this.recoveryModules = new Map();
        this.actionExecutor = null;
        this.testResults = [];
    }

    async runTests() {
        console.log('🧪 Starting Action Execution System Tests...\n');

        // Setup
        await this.setup();

        // Test 1: Action Registry
        await this.testActionRegistry();

        // Test 2: Parameter Validation
        await this.testParameterValidation();

        // Test 3: Action Execution
        await this.testActionExecution();

        // Test 4: Error Handling
        await this.testErrorHandling();

        // Test 5: Logging and History
        await this.testLoggingAndHistory();

        // Test 6: Statistics
        await this.testStatistics();

        // Print results
        this.printTestResults();

        return this.testResults;
    }

    async setup() {
        console.log('🔧 Setting up test environment...');

        // StateManager initializes automatically in constructor

        // Create mock recovery modules
        this.recoveryModules.set('camera', new MockRecoveryModule('camera'));
        this.recoveryModules.set('obs', new MockRecoveryModule('obs'));
        this.recoveryModules.set('window', new MockRecoveryModule('window'));

        // Initialize action executor
        this.actionExecutor = new ActionExecutor(this.stateManager, this.recoveryModules);

        // Add some test issues
        this.stateManager.addIssue('cameras', 'Camera stream failed', 'error');
        this.stateManager.addIssue('obs', 'OBS connection lost', 'warning');

        console.log('✅ Test environment setup complete\n');
    }

    async testActionRegistry() {
        console.log('📋 Testing action registry...');

        try {
            const actions = this.actionExecutor.getAvailableActions();
            
            const expectedActions = [
                'scan-cameras', 'fix-camera', 'restart-camera-stream',
                'show-window', 'restore-window',
                'reconnect-obs', 'restart-obs-virtual-camera', 'switch-obs-scene',
                'auto-recover', 'test-recovery', 'clear-issues',
                'restart-system', 'force-state-refresh'
            ];

            const registeredActions = Object.keys(actions);
            const hasAllActions = expectedActions.every(action => registeredActions.includes(action));

            this.addTestResult('Action Registry', hasAllActions, 
                hasAllActions ? 
                `All ${expectedActions.length} expected actions registered` : 
                `Missing actions: ${expectedActions.filter(a => !registeredActions.includes(a)).join(', ')}`
            );

            // Test action metadata
            const scanCameraAction = actions['scan-cameras'];
            const hasMetadata = scanCameraAction && 
                scanCameraAction.description && 
                scanCameraAction.category === 'camera' &&
                typeof scanCameraAction.estimatedDuration === 'number';

            this.addTestResult('Action Metadata', hasMetadata,
                hasMetadata ? 'Action metadata is complete' : 'Action metadata is incomplete'
            );

        } catch (error) {
            this.addTestResult('Action Registry', false, `Error: ${error.message}`);
        }
    }

    async testParameterValidation() {
        console.log('✅ Testing parameter validation...');

        try {
            // Test action that doesn't require parameters
            const result1 = await this.actionExecutor.executeAction('scan-cameras', {});
            this.addTestResult('No Params Required', result1.success,
                result1.success ? 'Action executed without parameters' : result1.message
            );

            // Test action that requires parameters - should fail without them
            const result2 = await this.actionExecutor.executeAction('restart-camera-stream', {});
            this.addTestResult('Missing Required Params', !result2.success,
                !result2.success ? 'Correctly rejected missing parameters' : 'Should have failed validation'
            );

            // Test action with required parameters - should succeed
            const result3 = await this.actionExecutor.executeAction('restart-camera-stream', { cameraId: 'test-camera' });
            this.addTestResult('Valid Required Params', result3.success,
                result3.success ? 'Action executed with valid parameters' : result3.message
            );

        } catch (error) {
            this.addTestResult('Parameter Validation', false, `Error: ${error.message}`);
        }
    }

    async testActionExecution() {
        console.log('⚡ Testing action execution...');

        try {
            // Test camera scan
            const scanResult = await this.actionExecutor.executeAction('scan-cameras');
            this.addTestResult('Camera Scan', scanResult.success,
                scanResult.success ? scanResult.message : scanResult.message
            );

            // Test camera fix
            const fixResult = await this.actionExecutor.executeAction('fix-camera');
            this.addTestResult('Camera Fix', fixResult.success,
                fixResult.success ? fixResult.message : fixResult.message
            );

            // Test auto recovery
            const autoRecoverResult = await this.actionExecutor.executeAction('auto-recover');
            this.addTestResult('Auto Recovery', autoRecoverResult.success,
                autoRecoverResult.success ? autoRecoverResult.message : autoRecoverResult.message
            );

            // Test system restart
            const restartResult = await this.actionExecutor.executeAction('restart-system');
            this.addTestResult('System Restart', restartResult.success,
                restartResult.success ? restartResult.message : restartResult.message
            );

        } catch (error) {
            this.addTestResult('Action Execution', false, `Error: ${error.message}`);
        }
    }

    async testErrorHandling() {
        console.log('❌ Testing error handling...');

        try {
            // Test unknown action
            const unknownResult = await this.actionExecutor.executeAction('unknown-action');
            this.addTestResult('Unknown Action', !unknownResult.success,
                !unknownResult.success ? 'Correctly handled unknown action' : 'Should have failed'
            );

            // Test action with invalid parameters
            const invalidParamsResult = await this.actionExecutor.executeAction('switch-obs-scene', { invalidParam: 'test' });
            this.addTestResult('Invalid Parameters', !invalidParamsResult.success,
                !invalidParamsResult.success ? 'Correctly handled invalid parameters' : 'Should have failed validation'
            );

        } catch (error) {
            this.addTestResult('Error Handling', false, `Error: ${error.message}`);
        }
    }

    async testLoggingAndHistory() {
        console.log('📝 Testing logging and history...');

        try {
            // Execute a few actions to generate history
            await this.actionExecutor.executeAction('test-recovery');
            await this.actionExecutor.executeAction('scan-cameras');
            await this.actionExecutor.executeAction('unknown-action'); // This will fail

            // Test history retrieval
            const history = this.actionExecutor.getActionHistory(10);
            this.addTestResult('Action History', history.length >= 3,
                history.length >= 3 ? `History contains ${history.length} entries` : 'History is incomplete'
            );

            // Test history entry format
            const firstEntry = history[0];
            const hasRequiredFields = firstEntry && 
                firstEntry.timestamp && 
                firstEntry.executionId && 
                firstEntry.action && 
                typeof firstEntry.success === 'boolean';

            this.addTestResult('History Entry Format', hasRequiredFields,
                hasRequiredFields ? 'History entries have correct format' : 'History entry format is incorrect'
            );

        } catch (error) {
            this.addTestResult('Logging and History', false, `Error: ${error.message}`);
        }
    }

    async testStatistics() {
        console.log('📊 Testing statistics...');

        try {
            const statistics = this.actionExecutor.getActionStatistics();
            
            const hasBasicStats = statistics && 
                typeof statistics.total === 'number' &&
                typeof statistics.successful === 'number' &&
                typeof statistics.failed === 'number' &&
                typeof statistics.successRate === 'string';

            this.addTestResult('Basic Statistics', hasBasicStats,
                hasBasicStats ? `Stats: ${statistics.total} total, ${statistics.successRate}% success rate` : 'Statistics format is incorrect'
            );

            const hasCategoryStats = statistics.categories && 
                typeof statistics.categories === 'object';

            this.addTestResult('Category Statistics', hasCategoryStats,
                hasCategoryStats ? `Categories tracked: ${Object.keys(statistics.categories).join(', ')}` : 'Category statistics missing'
            );

        } catch (error) {
            this.addTestResult('Statistics', false, `Error: ${error.message}`);
        }
    }

    addTestResult(testName, passed, message) {
        const result = {
            name: testName,
            passed,
            message,
            timestamp: new Date().toISOString()
        };
        
        this.testResults.push(result);
        
        const status = passed ? '✅' : '❌';
        console.log(`${status} ${testName}: ${message}`);
    }

    printTestResults() {
        console.log('\n📋 Test Results Summary:');
        console.log('========================');
        
        const passedTests = this.testResults.filter(r => r.passed).length;
        const totalTests = this.testResults.length;
        
        console.log(`Passed: ${passedTests}/${totalTests} tests`);
        
        if (passedTests === totalTests) {
            console.log('🎉 All tests passed! Action Execution System is working correctly.');
        } else {
            console.log('⚠️ Some tests failed. Check the implementation.');
        }
        
        console.log('\nDetailed Results:');
        this.testResults.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${result.name}: ${result.message}`);
        });
    }
}

// Run tests when this script is executed directly
if (require.main === module) {
    const tester = new ActionExecutorTester();
    
    tester.runTests().then(() => {
        console.log('\n🏁 Action Execution System tests completed');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = ActionExecutorTester;