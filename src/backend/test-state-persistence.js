/**
 * Comprehensive Test for State Persistence and Recovery
 * Tests all aspects of state persistence, backup, and crash recovery
 */

const StatePersistenceManager = require('./state-persistence-manager');
const StateManager = require('./state-manager');
const path = require('path');
const fs = require('fs').promises;

class StatePersistenceTester {
    constructor() {
        this.testResults = [];
        this.stateManager = null;
        this.persistenceManager = null;
        this.testDir = path.join(__dirname, 'test-persistence');
    }

    async runAllTests() {
        console.log('🧪 Starting comprehensive state persistence tests...\n');

        try {
            await this.setupTest();
            await this.testInitialization();
            await this.testStateSaving();
            await this.testStateRestoration();
            await this.testBackupSystem();
            await this.testCrashRecovery();
            await this.testConfigurationPersistence();
            await this.testAutoSave();
            await this.testGracefulShutdown();
            await this.testRecoveryLogging();
            await this.testPersistenceStatus();
            await this.cleanupTest();

            this.printResults();

        } catch (error) {
            console.error('❌ Test suite failed:', error);
            this.addResult('Test Suite', false, error.message);
        }
    }

    async setupTest() {
        console.log('🔧 Setting up test environment...');

        try {
            // Clean up any existing test directory
            try {
                await fs.rmdir(this.testDir, { recursive: true });
            } catch (error) {
                // Directory doesn't exist, that's ok
            }

            // Create state manager
            this.stateManager = new StateManager(path.join(this.testDir, 'test-state.json'));

            // Create persistence manager
            this.persistenceManager = new StatePersistenceManager(this.stateManager, {
                persistenceDir: path.join(this.testDir, 'persistence'),
                backupDir: path.join(this.testDir, 'backups'),
                autoSaveInterval: 1000, // 1 second for testing
                maxBackups: 3,
                crashRecoveryEnabled: true,
                configBackupEnabled: true
            });

            this.addResult('Test Setup', true, 'Test environment configured');

        } catch (error) {
            this.addResult('Test Setup', false, error.message);
            throw error;
        }
    }

    async testInitialization() {
        console.log('📋 Testing initialization...');

        try {
            // Test initialization
            const result = await this.persistenceManager.initialize();

            this.addResult('Persistence Initialize', result.success, 
                result.success ? 'Persistence manager initialized' : result.error);

            // Check if directories were created
            const persistenceDir = await this.directoryExists(this.persistenceManager.options.persistenceDir);
            const backupDir = await this.directoryExists(this.persistenceManager.options.backupDir);

            this.addResult('Directory Creation', persistenceDir && backupDir, 
                'Persistence and backup directories created');

            // Check initialization state
            this.addResult('Initialization State', this.persistenceManager.isInitialized, 
                'Manager marked as initialized');

        } catch (error) {
            this.addResult('Initialization', false, error.message);
        }
    }

    async testStateSaving() {
        console.log('💾 Testing state saving...');

        try {
            // Update state
            this.stateManager.updateState({
                cameras: { activeStreams: 2, permissions: 'granted' },
                obs: { connected: true, virtualCamera: true }
            }, 'test-update');

            // Save state
            const saveResult = await this.persistenceManager.saveSystemState('test-save');

            this.addResult('State Save', saveResult.success, 
                saveResult.success ? 'State saved successfully' : saveResult.error);

            // Check if state file exists
            const stateFileExists = await this.fileExists(this.persistenceManager.stateFile);
            this.addResult('State File Creation', stateFileExists, 
                stateFileExists ? 'State file created' : 'State file not found');

            // Verify state file content
            if (stateFileExists) {
                const stateData = await this.readJsonFile(this.persistenceManager.stateFile);
                const hasValidStructure = stateData.state && stateData.savedAt && stateData.source;
                
                this.addResult('State File Structure', hasValidStructure, 
                    hasValidStructure ? 'State file has valid structure' : 'Invalid state file structure');

                const hasCorrectData = stateData.state.cameras.activeStreams === 2;
                this.addResult('State Data Integrity', hasCorrectData, 
                    hasCorrectData ? 'State data matches expected values' : 'State data mismatch');
            }

        } catch (error) {
            this.addResult('State Saving', false, error.message);
        }
    }

    async testStateRestoration() {
        console.log('📂 Testing state restoration...');

        try {
            // Reset state manager to defaults
            this.stateManager.resetState();

            // Verify state is reset
            const resetState = this.stateManager.getState();
            const isReset = resetState.cameras.activeStreams === 0;
            this.addResult('State Reset', isReset, 
                isReset ? 'State reset to defaults' : `State not reset: activeStreams=${resetState.cameras.activeStreams}`);

            // Restore state
            const restoration = await this.persistenceManager.restoreSystemState();

            this.addResult('State Restoration', restoration.success, 
                restoration.success ? `State restored from ${restoration.source}` : restoration.error);

            if (restoration.success) {
                // Verify restored data
                const restoredState = this.stateManager.getState();
                const dataRestored = restoredState.cameras.activeStreams === 2;
                
                this.addResult('Restored Data Integrity', dataRestored, 
                    dataRestored ? 'Restored data matches saved data' : 'Data integrity check failed');
            }

        } catch (error) {
            this.addResult('State Restoration', false, error.message);
        }
    }

    async testBackupSystem() {
        console.log('📦 Testing backup system...');

        try {
            // Create multiple saves to generate backups
            for (let i = 0; i < 5; i++) {
                this.stateManager.updateState({
                    cameras: { activeStreams: i + 1 }
                }, `backup-test-${i}`);

                await this.persistenceManager.saveSystemState(`backup-${i}`);
                await this.sleep(100); // Small delay to ensure different timestamps
            }

            // Check backup files
            const backupFiles = await this.persistenceManager.getBackupFiles();
            const hasBackups = backupFiles.length > 0;
            
            this.addResult('Backup Creation', hasBackups, 
                hasBackups ? `${backupFiles.length} backup files created` : 'No backup files found');

            // Test backup limit
            const respectsLimit = backupFiles.length <= this.persistenceManager.options.maxBackups;
            this.addResult('Backup Limit', respectsLimit, 
                respectsLimit ? 'Backup limit respected' : 'Too many backup files');

            // Test backup restoration
            if (backupFiles.length > 0) {
                const backupRestoration = await this.persistenceManager.restoreFromFile(backupFiles[0]);
                this.addResult('Backup Restoration', backupRestoration.success, 
                    backupRestoration.success ? 'Backup restoration successful' : backupRestoration.error);
            }

        } catch (error) {
            this.addResult('Backup System', false, error.message);
        }
    }

    async testCrashRecovery() {
        console.log('💥 Testing crash recovery...');

        try {
            // Create crash marker manually
            const crashMarker = {
                timestamp: new Date().toISOString(),
                processId: 12345,
                uptime: 60000,
                nodeVersion: process.version,
                platform: process.platform
            };

            await fs.writeFile(this.persistenceManager.crashMarkerFile, JSON.stringify(crashMarker, null, 2));

            // Test crash detection
            const crashRecovery = await this.persistenceManager.checkCrashRecovery();
            
            this.addResult('Crash Detection', crashRecovery.crashed, 
                crashRecovery.crashed ? 'Crash detected correctly' : 'Crash not detected');

            if (crashRecovery.crashed) {
                this.addResult('Crash Data', crashRecovery.processId === 12345, 
                    'Crash data retrieved correctly');
            }

            // Test recovery statistics update
            const statsUpdated = this.persistenceManager.recoveryStats.crashRecoveries > 0;
            this.addResult('Recovery Stats', statsUpdated, 
                statsUpdated ? 'Recovery statistics updated' : 'Recovery statistics not updated');

        } catch (error) {
            this.addResult('Crash Recovery', false, error.message);
        }
    }

    async testConfigurationPersistence() {
        console.log('⚙️ Testing configuration persistence...');

        try {
            // Test configuration saving
            const testConfig = {
                theme: 'dark',
                autoStart: true,
                notifications: {
                    enabled: true,
                    sound: false
                },
                advanced: {
                    debugMode: false,
                    logLevel: 'info'
                }
            };

            const saveResult = await this.persistenceManager.saveConfiguration(testConfig, 'test-config');
            
            this.addResult('Config Save', saveResult.success, 
                saveResult.success ? 'Configuration saved' : saveResult.error);

            // Test configuration restoration
            const restoreResult = await this.persistenceManager.restoreConfiguration();
            
            this.addResult('Config Restore', restoreResult.success, 
                restoreResult.success ? 'Configuration restored' : restoreResult.error);

            if (restoreResult.success) {
                const configMatches = JSON.stringify(restoreResult.config) === JSON.stringify(testConfig);
                this.addResult('Config Integrity', configMatches, 
                    configMatches ? 'Configuration data integrity verified' : 'Configuration data mismatch');
            }

        } catch (error) {
            this.addResult('Configuration Persistence', false, error.message);
        }
    }

    async testAutoSave() {
        console.log('⏰ Testing auto-save functionality...');

        try {
            // Get initial save time
            const initialSaveTime = this.persistenceManager.lastSaveTime;

            // Update state
            this.stateManager.updateState({
                cameras: { activeStreams: 99 }
            }, 'auto-save-test');

            // Wait for auto-save interval
            await this.sleep(1500); // Wait longer than auto-save interval

            // Check if auto-save occurred
            const newSaveTime = this.persistenceManager.lastSaveTime;
            const autoSaveWorked = newSaveTime > initialSaveTime;

            this.addResult('Auto Save', autoSaveWorked, 
                autoSaveWorked ? 'Auto-save triggered successfully' : 'Auto-save did not trigger');

            // Verify auto-saved data
            const stateData = await this.readJsonFile(this.persistenceManager.stateFile);
            const autoSaveDataCorrect = stateData.source === 'auto-save';

            this.addResult('Auto Save Data', autoSaveDataCorrect, 
                autoSaveDataCorrect ? 'Auto-save data source correct' : 'Auto-save data source incorrect');

        } catch (error) {
            this.addResult('Auto Save', false, error.message);
        }
    }

    async testGracefulShutdown() {
        console.log('🛑 Testing graceful shutdown preparation...');

        try {
            // Test shutdown marker creation
            await this.persistenceManager.createShutdownMarker();

            const shutdownMarkerExists = await this.fileExists(this.persistenceManager.shutdownMarkerFile);
            this.addResult('Shutdown Marker', shutdownMarkerExists, 
                shutdownMarkerExists ? 'Shutdown marker created' : 'Shutdown marker not created');

            if (shutdownMarkerExists) {
                const shutdownData = await this.readJsonFile(this.persistenceManager.shutdownMarkerFile);
                const hasValidData = shutdownData.timestamp && shutdownData.graceful === true;
                
                this.addResult('Shutdown Data', hasValidData, 
                    hasValidData ? 'Shutdown marker has valid data' : 'Invalid shutdown marker data');
            }

            // Test crash marker removal
            await this.persistenceManager.removeCrashMarker();
            const crashMarkerRemoved = !(await this.fileExists(this.persistenceManager.crashMarkerFile));
            
            this.addResult('Crash Marker Removal', crashMarkerRemoved, 
                crashMarkerRemoved ? 'Crash marker removed' : 'Crash marker still exists');

        } catch (error) {
            this.addResult('Graceful Shutdown', false, error.message);
        }
    }

    async testRecoveryLogging() {
        console.log('📝 Testing recovery logging...');

        try {
            // Log some recovery events
            await this.persistenceManager.logRecoveryEvent('test-event-1', { data: 'test1' });
            await this.persistenceManager.logRecoveryEvent('test-event-2', { data: 'test2' });

            // Check if recovery log file exists
            const logFileExists = await this.fileExists(this.persistenceManager.recoveryLogFile);
            this.addResult('Recovery Log File', logFileExists, 
                logFileExists ? 'Recovery log file created' : 'Recovery log file not found');

            // Read recovery log
            const recoveryLog = await this.persistenceManager.getRecoveryLog(10);
            const hasLogEntries = recoveryLog.length > 0;
            
            this.addResult('Recovery Log Entries', hasLogEntries, 
                hasLogEntries ? `${recoveryLog.length} log entries found` : 'No log entries found');

            if (hasLogEntries) {
                const hasTestEvents = recoveryLog.some(entry => entry.event.startsWith('test-event'));
                this.addResult('Recovery Log Content', hasTestEvents, 
                    hasTestEvents ? 'Test events found in log' : 'Test events not found in log');
            }

        } catch (error) {
            this.addResult('Recovery Logging', false, error.message);
        }
    }

    async testPersistenceStatus() {
        console.log('📊 Testing persistence status...');

        try {
            // Get persistence status
            const status = await this.persistenceManager.getPersistenceStatus();

            const hasStatus = status && typeof status === 'object';
            this.addResult('Status Retrieval', hasStatus, 
                hasStatus ? 'Persistence status retrieved' : 'Failed to get status');

            if (hasStatus) {
                const hasRequiredFields = status.initialized !== undefined && 
                                        status.files && 
                                        status.backups && 
                                        status.recoveryStats;
                
                this.addResult('Status Structure', hasRequiredFields, 
                    hasRequiredFields ? 'Status has required fields' : 'Status missing required fields');

                const initializationCorrect = status.initialized === true;
                this.addResult('Status Initialization', initializationCorrect, 
                    initializationCorrect ? 'Initialization status correct' : 'Initialization status incorrect');
            }

        } catch (error) {
            this.addResult('Persistence Status', false, error.message);
        }
    }

    async cleanupTest() {
        console.log('🧹 Cleaning up test environment...');

        try {
            // Cleanup persistence manager
            await this.persistenceManager.cleanup();

            // Remove test directory
            await fs.rmdir(this.testDir, { recursive: true });

            this.addResult('Test Cleanup', true, 'Test environment cleaned up');

        } catch (error) {
            this.addResult('Test Cleanup', false, error.message);
        }
    }

    // Helper methods
    async directoryExists(dirPath) {
        try {
            const stats = await fs.stat(dirPath);
            return stats.isDirectory();
        } catch (error) {
            return false;
        }
    }

    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch (error) {
            return false;
        }
    }

    async readJsonFile(filePath) {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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

        console.log('\n🎉 State persistence testing complete!');
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new StatePersistenceTester();
    tester.runAllTests().catch(console.error);
}

module.exports = StatePersistenceTester;