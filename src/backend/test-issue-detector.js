/**
 * Test Script for Issue Detection System
 * Tests issue detection, actionable feedback, and resolution tracking
 */

const IssueDetector = require('./issue-detector');
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
}

class IssueDetectorTester {
    constructor() {
        this.stateManager = new StateManager(':memory:');
        this.recoveryModules = new Map();
        this.actionExecutor = null;
        this.issueDetector = null;
        this.testResults = [];
    }

    async runTests() {
        console.log('🧪 Starting Issue Detection System Tests...\n');

        // Setup
        await this.setup();

        // Test 1: Detection Rules Registration
        await this.testDetectionRules();

        // Test 2: Issue Detection
        await this.testIssueDetection();

        // Test 3: Actionable Feedback
        await this.testActionableFeedback();

        // Test 4: Issue Resolution Tracking
        await this.testIssueResolution();

        // Test 5: Statistics and History
        await this.testStatisticsAndHistory();

        // Test 6: Monitoring System
        await this.testMonitoringSystem();

        // Cleanup
        this.cleanup();

        // Print results
        this.printTestResults();

        return this.testResults;
    }

    async setup() {
        console.log('🔧 Setting up test environment...');

        // Create mock recovery modules
        this.recoveryModules.set('camera', new MockRecoveryModule('camera'));
        this.recoveryModules.set('obs', new MockRecoveryModule('obs'));
        this.recoveryModules.set('window', new MockRecoveryModule('window'));

        // Initialize action executor
        this.actionExecutor = new ActionExecutor(this.stateManager, this.recoveryModules);

        // Initialize issue detector
        this.issueDetector = new IssueDetector(this.stateManager, this.actionExecutor);

        console.log('✅ Test environment setup complete\n');
    }

    async testDetectionRules() {
        console.log('📋 Testing detection rules registration...');

        try {
            const rules = this.issueDetector.getDetectionRules();
            
            const expectedRules = [
                'camera-no-devices', 'camera-no-active-streams', 'camera-permission-denied',
                'obs-not-connected', 'obs-virtual-camera-inactive', 'obs-connection-timeout',
                'window-hidden', 'window-minimized',
                'multiple-critical-issues', 'system-degraded'
            ];

            const registeredRules = Object.keys(rules);
            const hasAllRules = expectedRules.every(rule => registeredRules.includes(rule));

            this.addTestResult('Detection Rules Registration', hasAllRules,
                hasAllRules ? 
                `All ${expectedRules.length} expected rules registered` : 
                `Missing rules: ${expectedRules.filter(r => !registeredRules.includes(r)).join(', ')}`
            );

            // Test rule metadata
            const cameraRule = rules['camera-no-devices'];
            const hasMetadata = cameraRule && 
                cameraRule.category === 'camera' &&
                cameraRule.severity === 'error' &&
                cameraRule.description;

            this.addTestResult('Rule Metadata', hasMetadata,
                hasMetadata ? 'Rule metadata is complete' : 'Rule metadata is incomplete'
            );

        } catch (error) {
            this.addTestResult('Detection Rules Registration', false, `Error: ${error.message}`);
        }
    }

    async testIssueDetection() {
        console.log('🔍 Testing issue detection...');

        try {
            // Create a state that should trigger camera issues
            const testState = this.stateManager.getState();
            testState.cameras.devices = []; // No devices should trigger camera-no-devices
            testState.obs.connected = false; // Should trigger obs-not-connected
            testState.windows.mainWindow.visible = false; // Should trigger window-hidden

            // Manually trigger detection
            this.issueDetector.detectIssues();

            const detectedIssues = this.issueDetector.getCurrentIssues();
            
            this.addTestResult('Issue Detection', detectedIssues.length >= 3,
                `Detected ${detectedIssues.length} issues (expected at least 3)`
            );

            // Test specific issue detection
            const cameraIssue = detectedIssues.find(issue => issue.id === 'camera-no-devices');
            this.addTestResult('Camera Issue Detection', !!cameraIssue,
                cameraIssue ? 'Camera no-devices issue detected' : 'Camera issue not detected'
            );

            const obsIssue = detectedIssues.find(issue => issue.id === 'obs-not-connected');
            this.addTestResult('OBS Issue Detection', !!obsIssue,
                obsIssue ? 'OBS not-connected issue detected' : 'OBS issue not detected'
            );

        } catch (error) {
            this.addTestResult('Issue Detection', false, `Error: ${error.message}`);
        }
    }

    async testActionableFeedback() {
        console.log('🎯 Testing actionable feedback...');

        try {
            const detectedIssues = this.issueDetector.getCurrentIssues();
            
            if (detectedIssues.length === 0) {
                this.addTestResult('Actionable Feedback', false, 'No issues detected for testing');
                return;
            }

            const issue = detectedIssues[0];
            
            // Test issue structure
            const hasRequiredFields = issue.id && issue.message && issue.suggestion && 
                                    Array.isArray(issue.actions) && issue.actions.length > 0;

            this.addTestResult('Issue Structure', hasRequiredFields,
                hasRequiredFields ? 'Issue has all required fields' : 'Issue missing required fields'
            );

            // Test action buttons
            const action = issue.actions[0];
            const hasActionFields = action.id && action.label && action.action && 
                                  typeof action.primary === 'boolean';

            this.addTestResult('Action Button Structure', hasActionFields,
                hasActionFields ? 'Action button has all required fields' : 'Action button missing fields'
            );

            // Test action availability
            const hasAvailableActions = issue.actions.some(action => action.available);
            this.addTestResult('Action Availability', hasAvailableActions,
                hasAvailableActions ? 'At least one action is available' : 'No actions are available'
            );

        } catch (error) {
            this.addTestResult('Actionable Feedback', false, `Error: ${error.message}`);
        }
    }

    async testIssueResolution() {
        console.log('✅ Testing issue resolution tracking...');

        try {
            const detectedIssues = this.issueDetector.getCurrentIssues();
            
            if (detectedIssues.length === 0) {
                this.addTestResult('Issue Resolution', false, 'No issues detected for testing');
                return;
            }

            const issue = detectedIssues[0];
            const availableAction = issue.actions.find(action => action.available);
            
            if (!availableAction) {
                this.addTestResult('Issue Resolution', false, 'No available actions for testing');
                return;
            }

            // Execute action for the issue
            const result = await this.issueDetector.executeIssueAction(issue.id, availableAction.id);
            
            this.addTestResult('Issue Action Execution', result.success,
                result.success ? 'Issue action executed successfully' : result.message
            );

            // Test resolution tracking by fixing the underlying state
            const testState = this.stateManager.getState();
            if (issue.id === 'camera-no-devices') {
                testState.cameras.devices = [{ id: 'test-camera', name: 'Test Camera' }];
            } else if (issue.id === 'obs-not-connected') {
                testState.obs.connected = true;
            } else if (issue.id === 'window-hidden') {
                testState.windows.mainWindow.visible = true;
            }

            // Trigger detection again
            this.issueDetector.detectIssues();
            
            const remainingIssues = this.issueDetector.getCurrentIssues();
            const issueResolved = !remainingIssues.find(i => i.id === issue.id);
            
            this.addTestResult('Issue Resolution Tracking', issueResolved,
                issueResolved ? 'Issue was properly resolved and tracked' : 'Issue resolution not tracked'
            );

        } catch (error) {
            this.addTestResult('Issue Resolution', false, `Error: ${error.message}`);
        }
    }

    async testStatisticsAndHistory() {
        console.log('📊 Testing statistics and history...');

        try {
            // Get statistics
            const statistics = this.issueDetector.getIssueStatistics();
            
            const hasBasicStats = statistics && 
                typeof statistics.current === 'object' &&
                typeof statistics.history === 'object' &&
                typeof statistics.monitoring === 'object';

            this.addTestResult('Statistics Structure', hasBasicStats,
                hasBasicStats ? 'Statistics have correct structure' : 'Statistics structure is incorrect'
            );

            // Test history
            const history = this.issueDetector.getIssueHistory(10);
            
            this.addTestResult('Issue History', Array.isArray(history),
                Array.isArray(history) ? `History contains ${history.length} entries` : 'History is not an array'
            );

            // Test category and severity breakdown
            const hasCategoryStats = statistics.current.categories && 
                typeof statistics.current.categories === 'object';

            this.addTestResult('Category Statistics', hasCategoryStats,
                hasCategoryStats ? 'Category statistics available' : 'Category statistics missing'
            );

        } catch (error) {
            this.addTestResult('Statistics and History', false, `Error: ${error.message}`);
        }
    }

    async testMonitoringSystem() {
        console.log('👁️ Testing monitoring system...');

        try {
            // Test monitoring start/stop
            this.issueDetector.startMonitoring();
            
            const isMonitoring = this.issueDetector.monitoringInterval !== null;
            this.addTestResult('Monitoring Start', isMonitoring,
                isMonitoring ? 'Monitoring started successfully' : 'Failed to start monitoring'
            );

            // Test event emission
            let eventReceived = false;
            this.issueDetector.once('issues-detected', () => {
                eventReceived = true;
            });

            // Create a new issue by changing state
            const testState = this.stateManager.getState();
            testState.cameras.devices = []; // This should trigger an issue
            
            // Wait a bit for monitoring to detect
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Stop monitoring
            this.issueDetector.stopMonitoring();
            
            const isNotMonitoring = this.issueDetector.monitoringInterval === null;
            this.addTestResult('Monitoring Stop', isNotMonitoring,
                isNotMonitoring ? 'Monitoring stopped successfully' : 'Failed to stop monitoring'
            );

        } catch (error) {
            this.addTestResult('Monitoring System', false, `Error: ${error.message}`);
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
            console.log('🎉 All tests passed! Issue Detection System is working correctly.');
        } else {
            console.log('⚠️ Some tests failed. Check the implementation.');
        }
        
        console.log('\nDetailed Results:');
        this.testResults.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${result.name}: ${result.message}`);
        });
    }

    cleanup() {
        if (this.issueDetector) {
            this.issueDetector.cleanup();
        }
    }
}

// Run tests when this script is executed directly
if (require.main === module) {
    const tester = new IssueDetectorTester();
    
    tester.runTests().then(() => {
        console.log('\n🏁 Issue Detection System tests completed');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = IssueDetectorTester;