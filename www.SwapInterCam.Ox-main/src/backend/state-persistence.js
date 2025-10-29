/**
 * State Persistence and Recovery System
 * Handles graceful shutdown, state saving, startup restoration, and crash recovery
 */

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class StatePersistence extends EventEmitter {
    constructor(stateManager, logger, options = {}) {
        super();
        this.stateManager = stateManager;
        this.logger = logger;
        
        this.options = {
            persistenceDir: options.persistenceDir || path.join(__dirname, 'persistence'),
            stateFile: options.stateFile || 'system-state.json',
            configFile: options.configFile || 'system-config.json',
            backupFile: options.backupFile || 'system-backup.json',
            crashRecoveryFile: options.crashRecoveryFile || 'crash-recovery.json',
            autoSaveInterval: options.autoSaveInterval || 30000, // 30 seconds
            maxBackups: options.maxBackups || 10,
            enableAutoSave: options.enableAutoSave !== false,
            enableCrashRecovery: options.enableCrashRecovery !== false,
            ...options
        };

        // File paths
        this.stateFilePath = path.join(this.options.persistenceDir, this.options.stateFile);
        this.configFilePath = path.join(this.options.persistenceDir, this.options.configFile);
        this.backupFilePath = path.join(this.options.persistenceDir, this.options.backupFile);
        this.crashRecoveryFilePath = path.join(this.options.persistenceDir, this.options.crashRecoveryFile);

        // State tracking
        this.isInitialized = false;
        this.autoSaveInterval = null;
        this.lastSaveTime = null;
        this.shutdownInProgress = false;
        this.crashRecoveryData = null;

        // Graceful shutdown handlers
        this.setupShutdownHandlers();

        console.log('💾 State Persistence system initialized');
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            console.log('🚀 Initializing state persistence...');

            // Create persistence directory
            await this.ensurePersistenceDirectory();

            // Check for crash recovery
            if (this.options.enableCrashRecovery) {
                await this.checkCrashRecovery();
            }

            // Restore state from persistence
            await this.restoreState();

            // Start auto-save if enabled
            if (this.options.enableAutoSave) {
                this.startAutoSave();
            }

            // Set up state change listeners
            this.setupStateChangeListeners();

            this.isInitialized = true;
            this.logger.info('State persistence initialized', {
                type: 'persistence',
                options: this.options
            });

            console.log('✅ State persistence ready');

        } catch (error) {
            console.error('❌ Failed to initialize state persistence:', error);
            this.logger.error('Failed to initialize state persistence', { error });
            throw error;
        }
    }

    async ensurePersistenceDirectory() {
        try {
            await fs.mkdir(this.options.persistenceDir, { recursive: true });
            console.log('📁 Persistence directory ready:', this.options.persistenceDir);
        } catch (error) {
            console.error('❌ Failed to create persistence directory:', error);
            throw error;
        }
    }

    setupShutdownHandlers() {
        // Handle various shutdown signals
        const shutdownSignals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
        
        shutdownSignals.forEach(signal => {
            process.on(signal, async () => {
                console.log(`\n🛑 Received ${signal}, initiating graceful shutdown...`);
                await this.gracefulShutdown();
                process.exit(0);
            });
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', async (error) => {
            console.error('💥 Uncaught Exception:', error);
            this.logger.error('Uncaught exception', { error });
            
            if (this.options.enableCrashRecovery) {
                await this.saveCrashRecoveryData(error);
            }
            
            await this.emergencyStateSave();
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', async (reason, promise) => {
            console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
            this.logger.error('Unhandled promise rejection', { reason, promise: promise.toString() });
            
            if (this.options.enableCrashRecovery) {
                await this.saveCrashRecoveryData(reason);
            }
            
            await this.emergencyStateSave();
            process.exit(1);
        });

        console.log('🛡️ Shutdown handlers configured');
    }

    setupStateChangeListeners() {
        if (this.stateManager) {
            // Listen for state changes to trigger saves
            this.stateManager.on('stateChanged', (changes) => {
                this.onStateChanged(changes);
            });

            console.log('👂 State change listeners configured');
        }
    }

    onStateChanged(changes) {
        // Emit event for other systems
        this.emit('stateChanged', changes);

        // Log state change
        this.logger.stateChange('system', changes, this.stateManager.getState());

        // Trigger auto-save if significant changes
        if (this.isSignificantChange(changes)) {
            this.scheduleStateSave();
        }
    }

    isSignificantChange(changes) {
        // Define what constitutes a significant change that should trigger a save
        const significantKeys = [
            'cameras', 'obs', 'windows', 'recovery', 'issues', 'connections'
        ];

        return Object.keys(changes).some(key => significantKeys.includes(key));
    }

    scheduleStateSave() {
        // Debounce state saves to avoid too frequent writes
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(async () => {
            try {
                await this.saveState();
            } catch (error) {
                this.logger.error('Failed to save state', { error });
            }
        }, 1000); // Wait 1 second before saving
    }

    startAutoSave() {
        if (this.autoSaveInterval) {
            return; // Already started
        }

        console.log(`⏰ Starting auto-save (interval: ${this.options.autoSaveInterval}ms)`);

        this.autoSaveInterval = setInterval(async () => {
            try {
                await this.saveState();
            } catch (error) {
                this.logger.error('Auto-save failed', { error });
            }
        }, this.options.autoSaveInterval);

        this.logger.info('Auto-save started', {
            type: 'persistence',
            interval: this.options.autoSaveInterval
        });
    }

    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
            console.log('⏰ Auto-save stopped');
        }
    }

    async saveState() {
        if (!this.stateManager || this.shutdownInProgress) {
            return;
        }

        try {
            const startTime = Date.now();
            const currentState = this.stateManager.getState();
            
            // Create state snapshot with metadata
            const stateSnapshot = {
                timestamp: Date.now(),
                version: '1.0.0',
                processId: process.pid,
                uptime: process.uptime(),
                state: currentState,
                metadata: {
                    savedAt: new Date().toISOString(),
                    nodeVersion: process.version,
                    platform: process.platform,
                    arch: process.arch
                }
            };

            // Create backup of current state file if it exists
            await this.createBackup();

            // Write new state
            await fs.writeFile(this.stateFilePath, JSON.stringify(stateSnapshot, null, 2));

            const duration = Date.now() - startTime;
            this.lastSaveTime = Date.now();

            this.logger.performance('State save', duration, {
                type: 'persistence',
                stateSize: JSON.stringify(currentState).length,
                timestamp: stateSnapshot.timestamp
            });

            this.emit('stateSaved', { duration, timestamp: stateSnapshot.timestamp });

        } catch (error) {
            console.error('❌ Failed to save state:', error);
            this.logger.error('Failed to save state', { error });
            throw error;
        }
    }

    async createBackup() {
        try {
            // Check if current state file exists
            await fs.access(this.stateFilePath);
            
            // Create timestamped backup
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(
                this.options.persistenceDir, 
                `backup-${timestamp}-${this.options.stateFile}`
            );

            await fs.copyFile(this.stateFilePath, backupPath);

            // Clean up old backups
            await this.cleanupOldBackups();

        } catch (error) {
            // File doesn't exist or other error, continue without backup
            if (error.code !== 'ENOENT') {
                console.warn('⚠️ Failed to create backup:', error.message);
            }
        }
    }

    async cleanupOldBackups() {
        try {
            const files = await fs.readdir(this.options.persistenceDir);
            const backupFiles = files
                .filter(file => file.startsWith('backup-') && file.endsWith(this.options.stateFile))
                .map(file => ({
                    name: file,
                    path: path.join(this.options.persistenceDir, file),
                    time: fs.stat(path.join(this.options.persistenceDir, file)).then(stats => stats.mtime)
                }));

            // Sort by modification time (newest first)
            const backupFilesWithStats = await Promise.all(
                backupFiles.map(async file => ({
                    ...file,
                    time: await file.time
                }))
            );

            backupFilesWithStats.sort((a, b) => b.time - a.time);

            // Remove old backups beyond the limit
            if (backupFilesWithStats.length > this.options.maxBackups) {
                const filesToDelete = backupFilesWithStats.slice(this.options.maxBackups);
                
                for (const file of filesToDelete) {
                    await fs.unlink(file.path);
                    console.log(`🗑️ Removed old backup: ${file.name}`);
                }
            }

        } catch (error) {
            console.warn('⚠️ Failed to cleanup old backups:', error.message);
        }
    }

    async restoreState() {
        try {
            console.log('🔄 Attempting to restore state...');

            // Check if state file exists
            await fs.access(this.stateFilePath);

            // Read and parse state file
            const stateData = await fs.readFile(this.stateFilePath, 'utf8');
            const stateSnapshot = JSON.parse(stateData);

            // Validate state snapshot
            if (!this.validateStateSnapshot(stateSnapshot)) {
                throw new Error('Invalid state snapshot format');
            }

            // Restore state to state manager
            if (this.stateManager && stateSnapshot.state) {
                await this.stateManager.restoreState(stateSnapshot.state);
                
                this.logger.info('State restored successfully', {
                    type: 'persistence',
                    timestamp: stateSnapshot.timestamp,
                    version: stateSnapshot.version,
                    age: Date.now() - stateSnapshot.timestamp
                });

                console.log(`✅ State restored from ${new Date(stateSnapshot.timestamp).toLocaleString()}`);
                this.emit('stateRestored', stateSnapshot);
                return true;
            }

        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('📝 No previous state found, starting fresh');
                this.logger.info('No previous state found, starting fresh', { type: 'persistence' });
            } else {
                console.error('❌ Failed to restore state:', error);
                this.logger.error('Failed to restore state', { error });
                
                // Try to restore from backup
                const restored = await this.restoreFromBackup();
                if (!restored) {
                    throw error;
                }
            }
        }

        return false;
    }

    validateStateSnapshot(snapshot) {
        return (
            snapshot &&
            typeof snapshot === 'object' &&
            snapshot.timestamp &&
            snapshot.version &&
            snapshot.state &&
            typeof snapshot.state === 'object'
        );
    }

    async restoreFromBackup() {
        try {
            console.log('🔄 Attempting to restore from backup...');

            const files = await fs.readdir(this.options.persistenceDir);
            const backupFiles = files
                .filter(file => file.startsWith('backup-') && file.endsWith(this.options.stateFile))
                .sort()
                .reverse(); // Most recent first

            for (const backupFile of backupFiles) {
                try {
                    const backupPath = path.join(this.options.persistenceDir, backupFile);
                    const backupData = await fs.readFile(backupPath, 'utf8');
                    const stateSnapshot = JSON.parse(backupData);

                    if (this.validateStateSnapshot(stateSnapshot)) {
                        // Restore from this backup
                        if (this.stateManager && stateSnapshot.state) {
                            await this.stateManager.restoreState(stateSnapshot.state);
                            
                            this.logger.info('State restored from backup', {
                                type: 'persistence',
                                backupFile,
                                timestamp: stateSnapshot.timestamp
                            });

                            console.log(`✅ State restored from backup: ${backupFile}`);
                            this.emit('stateRestoredFromBackup', { backupFile, stateSnapshot });
                            return true;
                        }
                    }
                } catch (backupError) {
                    console.warn(`⚠️ Failed to restore from backup ${backupFile}:`, backupError.message);
                    continue;
                }
            }

            console.log('❌ No valid backups found');
            return false;

        } catch (error) {
            console.error('❌ Failed to restore from backup:', error);
            return false;
        }
    }

    async saveConfiguration(config) {
        try {
            const configSnapshot = {
                timestamp: Date.now(),
                version: '1.0.0',
                config: config,
                metadata: {
                    savedAt: new Date().toISOString(),
                    processId: process.pid
                }
            };

            await fs.writeFile(this.configFilePath, JSON.stringify(configSnapshot, null, 2));

            this.logger.info('Configuration saved', {
                type: 'persistence',
                timestamp: configSnapshot.timestamp
            });

            console.log('⚙️ Configuration saved');
            this.emit('configurationSaved', configSnapshot);

        } catch (error) {
            console.error('❌ Failed to save configuration:', error);
            this.logger.error('Failed to save configuration', { error });
            throw error;
        }
    }

    async restoreConfiguration() {
        try {
            await fs.access(this.configFilePath);
            
            const configData = await fs.readFile(this.configFilePath, 'utf8');
            const configSnapshot = JSON.parse(configData);

            if (configSnapshot && configSnapshot.config) {
                this.logger.info('Configuration restored', {
                    type: 'persistence',
                    timestamp: configSnapshot.timestamp
                });

                console.log('⚙️ Configuration restored');
                this.emit('configurationRestored', configSnapshot);
                return configSnapshot.config;
            }

        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('⚙️ No previous configuration found');
            } else {
                console.error('❌ Failed to restore configuration:', error);
                this.logger.error('Failed to restore configuration', { error });
            }
        }

        return null;
    }

    async checkCrashRecovery() {
        try {
            await fs.access(this.crashRecoveryFilePath);
            
            const crashData = await fs.readFile(this.crashRecoveryFilePath, 'utf8');
            const crashRecovery = JSON.parse(crashData);

            if (crashRecovery && crashRecovery.timestamp) {
                const crashAge = Date.now() - crashRecovery.timestamp;
                
                console.log(`💥 Crash recovery data found (${Math.round(crashAge / 1000)}s ago)`);
                
                this.logger.warn('Crash recovery data found', {
                    type: 'persistence',
                    crashRecovery,
                    crashAge
                });

                this.crashRecoveryData = crashRecovery;
                this.emit('crashRecoveryDetected', crashRecovery);

                // Clean up crash recovery file
                await fs.unlink(this.crashRecoveryFilePath);
                console.log('🧹 Crash recovery file cleaned up');

                return crashRecovery;
            }

        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('❌ Failed to check crash recovery:', error);
            }
        }

        return null;
    }

    async saveCrashRecoveryData(error) {
        try {
            const crashData = {
                timestamp: Date.now(),
                error: {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                },
                processInfo: {
                    pid: process.pid,
                    uptime: process.uptime(),
                    memoryUsage: process.memoryUsage(),
                    version: process.version,
                    platform: process.platform
                },
                systemState: this.stateManager ? this.stateManager.getState() : null
            };

            await fs.writeFile(this.crashRecoveryFilePath, JSON.stringify(crashData, null, 2));
            console.log('💾 Crash recovery data saved');

        } catch (saveError) {
            console.error('❌ Failed to save crash recovery data:', saveError);
        }
    }

    async emergencyStateSave() {
        try {
            console.log('🚨 Performing emergency state save...');
            
            const emergencyPath = path.join(this.options.persistenceDir, 'emergency-state.json');
            const currentState = this.stateManager ? this.stateManager.getState() : {};
            
            const emergencySnapshot = {
                timestamp: Date.now(),
                type: 'emergency',
                state: currentState,
                processInfo: {
                    pid: process.pid,
                    uptime: process.uptime(),
                    memoryUsage: process.memoryUsage()
                }
            };

            await fs.writeFile(emergencyPath, JSON.stringify(emergencySnapshot, null, 2));
            console.log('✅ Emergency state saved');

        } catch (error) {
            console.error('❌ Emergency state save failed:', error);
        }
    }

    async gracefulShutdown() {
        if (this.shutdownInProgress) {
            return;
        }

        this.shutdownInProgress = true;
        console.log('🛑 Starting graceful shutdown...');

        try {
            // Stop auto-save
            this.stopAutoSave();

            // Save current state
            if (this.stateManager) {
                console.log('💾 Saving final state...');
                await this.saveState();
            }

            // Save configuration if available
            if (this.stateManager && this.stateManager.getConfiguration) {
                const config = this.stateManager.getConfiguration();
                if (config) {
                    await this.saveConfiguration(config);
                }
            }

            // Clean up crash recovery file (normal shutdown)
            try {
                await fs.unlink(this.crashRecoveryFilePath);
            } catch (error) {
                // File doesn't exist, that's fine
            }

            this.logger.info('Graceful shutdown completed', { type: 'persistence' });
            console.log('✅ Graceful shutdown completed');

            this.emit('shutdownComplete');

        } catch (error) {
            console.error('❌ Error during graceful shutdown:', error);
            this.logger.error('Error during graceful shutdown', { error });
        }
    }

    // Public API methods
    async manualSave() {
        return await this.saveState();
    }

    async manualRestore() {
        return await this.restoreState();
    }

    getLastSaveTime() {
        return this.lastSaveTime;
    }

    getCrashRecoveryData() {
        return this.crashRecoveryData;
    }

    async getPersistenceStats() {
        const stats = {
            stateFile: null,
            configFile: null,
            backups: [],
            crashRecovery: null
        };

        try {
            // State file stats
            try {
                const stateStats = await fs.stat(this.stateFilePath);
                stats.stateFile = {
                    size: stateStats.size,
                    modified: stateStats.mtime,
                    exists: true
                };
            } catch (error) {
                stats.stateFile = { exists: false };
            }

            // Config file stats
            try {
                const configStats = await fs.stat(this.configFilePath);
                stats.configFile = {
                    size: configStats.size,
                    modified: configStats.mtime,
                    exists: true
                };
            } catch (error) {
                stats.configFile = { exists: false };
            }

            // Backup files
            try {
                const files = await fs.readdir(this.options.persistenceDir);
                const backupFiles = files.filter(file => 
                    file.startsWith('backup-') && file.endsWith(this.options.stateFile)
                );

                for (const backupFile of backupFiles) {
                    const backupPath = path.join(this.options.persistenceDir, backupFile);
                    const backupStats = await fs.stat(backupPath);
                    stats.backups.push({
                        name: backupFile,
                        size: backupStats.size,
                        modified: backupStats.mtime
                    });
                }

                stats.backups.sort((a, b) => b.modified - a.modified);
            } catch (error) {
                // Directory doesn't exist or other error
            }

            // Crash recovery
            try {
                const crashStats = await fs.stat(this.crashRecoveryFilePath);
                stats.crashRecovery = {
                    size: crashStats.size,
                    modified: crashStats.mtime,
                    exists: true
                };
            } catch (error) {
                stats.crashRecovery = { exists: false };
            }

        } catch (error) {
            console.error('❌ Failed to get persistence stats:', error);
        }

        return stats;
    }

    async cleanup() {
        console.log('🧹 Cleaning up state persistence...');

        this.shutdownInProgress = true;
        this.stopAutoSave();

        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }

        this.removeAllListeners();
        console.log('✅ State persistence cleanup complete');
    }
}

module.exports = StatePersistence;