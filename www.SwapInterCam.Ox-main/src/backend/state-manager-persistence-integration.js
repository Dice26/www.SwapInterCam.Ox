/**
 * State Manager Persistence Integration
 * Integrates the StatePersistence system with the existing StateManager
 */

const StatePersistence = require('./state-persistence');

class StateManagerPersistenceIntegration {
    constructor(stateManager, logger, options = {}) {
        this.stateManager = stateManager;
        this.logger = logger;
        this.options = {
            persistenceDir: options.persistenceDir || './persistence',
            autoSaveInterval: options.autoSaveInterval || 30000,
            enableAutoSave: options.enableAutoSave !== false,
            enableCrashRecovery: options.enableCrashRecovery !== false,
            maxBackups: options.maxBackups || 10,
            ...options
        };

        this.persistence = null;
        this.isInitialized = false;

        console.log('🔗 State Manager Persistence Integration initialized');
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            console.log('🚀 Initializing state manager persistence integration...');

            // Create persistence system
            this.persistence = new StatePersistence(this.stateManager, this.logger, this.options);

            // Set up event forwarding
            this.setupEventForwarding();

            // Initialize persistence
            await this.persistence.initialize();

            // Enhance state manager with persistence methods
            this.enhanceStateManager();

            this.isInitialized = true;
            this.logger.info('State manager persistence integration initialized', {
                type: 'persistence-integration',
                options: this.options
            });

            console.log('✅ State manager persistence integration ready');

        } catch (error) {
            console.error('❌ Failed to initialize state manager persistence integration:', error);
            this.logger.error('Failed to initialize state manager persistence integration', { error });
            throw error;
        }
    }

    setupEventForwarding() {
        // Forward persistence events to state manager
        this.persistence.on('stateRestored', (stateSnapshot) => {
            this.logger.info('State restored from persistence', {
                type: 'persistence-integration',
                timestamp: stateSnapshot.timestamp,
                age: Date.now() - stateSnapshot.timestamp
            });

            // Emit event on state manager if it supports events
            if (this.stateManager.emit) {
                this.stateManager.emit('stateRestored', stateSnapshot);
            }
        });

        this.persistence.on('stateSaved', (saveInfo) => {
            this.logger.debug('State saved to persistence', {
                type: 'persistence-integration',
                duration: saveInfo.duration,
                timestamp: saveInfo.timestamp
            });

            if (this.stateManager.emit) {
                this.stateManager.emit('stateSaved', saveInfo);
            }
        });

        this.persistence.on('crashRecoveryDetected', (crashData) => {
            this.logger.warn('Crash recovery detected during startup', {
                type: 'persistence-integration',
                crashAge: Date.now() - crashData.timestamp,
                error: crashData.error
            });

            if (this.stateManager.emit) {
                this.stateManager.emit('crashRecoveryDetected', crashData);
            }
        });

        this.persistence.on('configurationRestored', (configSnapshot) => {
            this.logger.info('Configuration restored from persistence', {
                type: 'persistence-integration',
                timestamp: configSnapshot.timestamp
            });

            if (this.stateManager.emit) {
                this.stateManager.emit('configurationRestored', configSnapshot);
            }
        });

        console.log('📡 Event forwarding configured');
    }

    enhanceStateManager() {
        // Add persistence methods to state manager
        const originalStateManager = this.stateManager;

        // Save state method
        originalStateManager.saveState = async () => {
            return await this.persistence.saveState();
        };

        // Manual restore method
        originalStateManager.restoreStateFromPersistence = async () => {
            return await this.persistence.manualRestore();
        };

        // Save configuration method
        originalStateManager.saveConfiguration = async (config) => {
            return await this.persistence.saveConfiguration(config);
        };

        // Restore configuration method
        originalStateManager.restoreConfiguration = async () => {
            return await this.persistence.restoreConfiguration();
        };

        // Get persistence stats
        originalStateManager.getPersistenceStats = async () => {
            return await this.persistence.getPersistenceStats();
        };

        // Get last save time
        originalStateManager.getLastSaveTime = () => {
            return this.persistence.getLastSaveTime();
        };

        // Get crash recovery data
        originalStateManager.getCrashRecoveryData = () => {
            return this.persistence.getCrashRecoveryData();
        };

        // Graceful shutdown
        originalStateManager.gracefulShutdown = async () => {
            return await this.persistence.gracefulShutdown();
        };

        console.log('🔧 State manager enhanced with persistence methods');
    }

    // Public API methods
    async saveState() {
        if (!this.persistence) {
            throw new Error('Persistence not initialized');
        }
        return await this.persistence.saveState();
    }

    async restoreState() {
        if (!this.persistence) {
            throw new Error('Persistence not initialized');
        }
        return await this.persistence.manualRestore();
    }

    async saveConfiguration(config) {
        if (!this.persistence) {
            throw new Error('Persistence not initialized');
        }
        return await this.persistence.saveConfiguration(config);
    }

    async restoreConfiguration() {
        if (!this.persistence) {
            throw new Error('Persistence not initialized');
        }
        return await this.persistence.restoreConfiguration();
    }

    async getPersistenceStats() {
        if (!this.persistence) {
            throw new Error('Persistence not initialized');
        }
        return await this.persistence.getPersistenceStats();
    }

    getLastSaveTime() {
        if (!this.persistence) {
            return null;
        }
        return this.persistence.getLastSaveTime();
    }

    getCrashRecoveryData() {
        if (!this.persistence) {
            return null;
        }
        return this.persistence.getCrashRecoveryData();
    }

    async gracefulShutdown() {
        if (!this.persistence) {
            return;
        }
        return await this.persistence.gracefulShutdown();
    }

    // Configuration management
    async updateConfiguration(configUpdates) {
        try {
            // Get current configuration from state manager
            let currentConfig = {};
            if (this.stateManager.getConfiguration) {
                currentConfig = this.stateManager.getConfiguration() || {};
            }

            // Merge updates
            const newConfig = { ...currentConfig, ...configUpdates };

            // Update state manager configuration if it supports it
            if (this.stateManager.setConfiguration) {
                this.stateManager.setConfiguration(newConfig);
            }

            // Save to persistence
            await this.saveConfiguration(newConfig);

            this.logger.info('Configuration updated and saved', {
                type: 'persistence-integration',
                updates: configUpdates
            });

            return newConfig;

        } catch (error) {
            this.logger.error('Failed to update configuration', { error, configUpdates });
            throw error;
        }
    }

    // Backup management
    async createManualBackup(label = '') {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupLabel = label ? `-${label}` : '';
            const backupName = `manual-backup${backupLabel}-${timestamp}`;

            // Save current state with custom name
            const currentState = this.stateManager.getState();
            const backupSnapshot = {
                timestamp: Date.now(),
                version: '1.0.0',
                type: 'manual-backup',
                label: label,
                state: currentState,
                metadata: {
                    createdAt: new Date().toISOString(),
                    processId: process.pid,
                    uptime: process.uptime()
                }
            };

            const backupPath = path.join(this.options.persistenceDir, `${backupName}.json`);
            await fs.writeFile(backupPath, JSON.stringify(backupSnapshot, null, 2));

            this.logger.info('Manual backup created', {
                type: 'persistence-integration',
                backupName,
                label
            });

            return {
                name: backupName,
                path: backupPath,
                timestamp: backupSnapshot.timestamp,
                label: label
            };

        } catch (error) {
            this.logger.error('Failed to create manual backup', { error, label });
            throw error;
        }
    }

    async listBackups() {
        try {
            const stats = await this.getPersistenceStats();
            const backups = stats.backups || [];

            // Add manual backups
            const fs = require('fs').promises;
            const path = require('path');
            
            try {
                const files = await fs.readdir(this.options.persistenceDir);
                const manualBackups = files.filter(file => file.startsWith('manual-backup-'));

                for (const backupFile of manualBackups) {
                    const backupPath = path.join(this.options.persistenceDir, backupFile);
                    const backupStats = await fs.stat(backupPath);
                    backups.push({
                        name: backupFile,
                        size: backupStats.size,
                        modified: backupStats.mtime,
                        type: 'manual'
                    });
                }
            } catch (error) {
                // Directory doesn't exist or other error
            }

            // Sort by modification time (newest first)
            backups.sort((a, b) => new Date(b.modified) - new Date(a.modified));

            return backups;

        } catch (error) {
            this.logger.error('Failed to list backups', { error });
            throw error;
        }
    }

    async restoreFromBackup(backupName) {
        try {
            const path = require('path');
            const fs = require('fs').promises;

            const backupPath = path.join(this.options.persistenceDir, backupName);
            const backupData = await fs.readFile(backupPath, 'utf8');
            const backupSnapshot = JSON.parse(backupData);

            if (!backupSnapshot.state) {
                throw new Error('Invalid backup format: missing state data');
            }

            // Restore state
            if (this.stateManager.restoreState) {
                await this.stateManager.restoreState(backupSnapshot.state);
            }

            // Save current state to persistence
            await this.saveState();

            this.logger.info('State restored from backup', {
                type: 'persistence-integration',
                backupName,
                backupTimestamp: backupSnapshot.timestamp
            });

            return {
                success: true,
                backupName,
                timestamp: backupSnapshot.timestamp,
                label: backupSnapshot.label
            };

        } catch (error) {
            this.logger.error('Failed to restore from backup', { error, backupName });
            throw error;
        }
    }

    // Health check for persistence system
    async healthCheck() {
        const health = {
            status: 'healthy',
            checks: {},
            timestamp: Date.now()
        };

        try {
            // Check if persistence is initialized
            health.checks.initialized = {
                healthy: this.isInitialized,
                message: this.isInitialized ? 'Persistence initialized' : 'Persistence not initialized'
            };

            // Check last save time
            const lastSaveTime = this.getLastSaveTime();
            const timeSinceLastSave = lastSaveTime ? Date.now() - lastSaveTime : null;
            health.checks.lastSave = {
                healthy: !lastSaveTime || timeSinceLastSave < 300000, // 5 minutes
                message: lastSaveTime ? 
                    `Last save: ${Math.round(timeSinceLastSave / 1000)}s ago` : 
                    'No saves yet',
                lastSaveTime,
                timeSinceLastSave
            };

            // Check persistence stats
            const stats = await this.getPersistenceStats();
            health.checks.stateFile = {
                healthy: stats.stateFile && stats.stateFile.exists,
                message: stats.stateFile && stats.stateFile.exists ? 
                    'State file exists' : 'State file missing',
                stats: stats.stateFile
            };

            health.checks.backups = {
                healthy: stats.backups && stats.backups.length > 0,
                message: stats.backups ? 
                    `${stats.backups.length} backups available` : 'No backups',
                count: stats.backups ? stats.backups.length : 0
            };

            // Check for crash recovery
            const crashRecoveryData = this.getCrashRecoveryData();
            health.checks.crashRecovery = {
                healthy: !crashRecoveryData,
                message: crashRecoveryData ? 
                    'Crash recovery data present' : 'No crash recovery data',
                hasCrashData: !!crashRecoveryData
            };

            // Determine overall health
            const failedChecks = Object.values(health.checks).filter(check => !check.healthy);
            if (failedChecks.length > 0) {
                health.status = failedChecks.some(check => check.critical) ? 'critical' : 'warning';
            }

        } catch (error) {
            health.status = 'error';
            health.error = error.message;
            this.logger.error('Persistence health check failed', { error });
        }

        return health;
    }

    async cleanup() {
        console.log('🧹 Cleaning up state manager persistence integration...');

        if (this.persistence) {
            await this.persistence.cleanup();
            this.persistence = null;
        }

        this.isInitialized = false;
        console.log('✅ State manager persistence integration cleanup complete');
    }
}

module.exports = StateManagerPersistenceIntegration;