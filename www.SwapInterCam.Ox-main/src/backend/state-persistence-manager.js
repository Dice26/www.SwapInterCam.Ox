/**
 * State Persistence and Recovery Manager
 * Enhanced state persistence with graceful shutdown, crash recovery, and configuration backup
 */

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class StatePersistenceManager extends EventEmitter {
    constructor(stateManager, options = {}) {
        super();
        this.stateManager = stateManager;
        this.options = {
            persistenceDir: options.persistenceDir || path.join(__dirname, 'persistence'),
            backupDir: options.backupDir || path.join(__dirname, 'backups'),
            autoSaveInterval: options.autoSaveInterval || 30000, // 30 seconds
            maxBackups: options.maxBackups || 10,
            crashRecoveryEnabled: options.crashRecoveryEnabled !== false,
            configBackupEnabled: options.configBackupEnabled !== false,
            compressionEnabled: options.compressionEnabled !== false,
            ...options
        };

        // File paths
        this.stateFile = path.join(this.options.persistenceDir, 'system-state.json');
        this.configFile = path.join(this.options.persistenceDir, 'system-config.json');
        this.crashMarkerFile = path.join(this.options.persistenceDir, 'crash-marker.json');
        this.shutdownMarkerFile = path.join(this.options.persistenceDir, 'shutdown-marker.json');
        this.recoveryLogFile = path.join(this.options.persistenceDir, 'recovery.log');

        // Persistence state
        this.isInitialized = false;
        this.autoSaveTimer = null;
        this.shutdownInProgress = false;
        this.lastSaveTime = null;
        this.saveQueue = [];
        this.isSaving = false;

        // Recovery statistics
        this.recoveryStats = {
            totalRecoveries: 0,
            successfulRecoveries: 0,
            failedRecoveries: 0,
            lastRecoveryTime: null,
            crashRecoveries: 0,
            gracefulRestores: 0
        };

        console.log('💾 State Persistence Manager initialized');
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            console.log('🚀 Initializing state persistence and recovery...');

            // Create directories
            await this.ensureDirectories();

            // Check for crash recovery
            const crashRecovery = await this.checkCrashRecovery();

            // Load recovery statistics
            await this.loadRecoveryStats();

            // Restore state
            const restoration = await this.restoreSystemState();

            // Setup auto-save
            this.setupAutoSave();

            // Setup graceful shutdown handlers
            this.setupShutdownHandlers();

            // Create crash marker
            await this.createCrashMarker();

            this.isInitialized = true;

            console.log('✅ State persistence and recovery ready');

            // Emit initialization event
            this.emit('initialized', {
                crashRecovery,
                restoration,
                recoveryStats: this.recoveryStats
            });

            return {
                success: true,
                crashRecovery,
                restoration,
                recoveryStats: this.recoveryStats
            };

        } catch (error) {
            console.error('❌ Failed to initialize state persistence:', error);
            throw error;
        }
    }

    async ensureDirectories() {
        const directories = [
            this.options.persistenceDir,
            this.options.backupDir
        ];

        for (const dir of directories) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                console.error(`❌ Failed to create directory ${dir}:`, error);
                throw error;
            }
        }

        console.log('📁 Persistence directories ensured');
    }

    async checkCrashRecovery() {
        try {
            const crashMarker = await fs.readFile(this.crashMarkerFile, 'utf8');
            const crashData = JSON.parse(crashMarker);

            console.log('💥 Crash detected from previous session');
            
            // Log crash recovery
            await this.logRecoveryEvent('crash-detected', {
                crashTime: crashData.timestamp,
                processId: crashData.processId,
                uptime: crashData.uptime
            });

            this.recoveryStats.crashRecoveries++;
            this.recoveryStats.totalRecoveries++;

            return {
                crashed: true,
                crashTime: crashData.timestamp,
                processId: crashData.processId,
                uptime: crashData.uptime
            };

        } catch (error) {
            // No crash marker found - normal startup
            return { crashed: false };
        }
    }

    async restoreSystemState() {
        try {
            console.log('📂 Restoring system state...');

            // Try to restore from main state file
            let restoration = await this.restoreFromFile(this.stateFile);

            if (!restoration.success) {
                console.log('📂 Main state file failed, trying backups...');
                restoration = await this.restoreFromBackups();
            }

            if (restoration.success) {
                this.recoveryStats.successfulRecoveries++;
                this.recoveryStats.gracefulRestores++;
                this.recoveryStats.lastRecoveryTime = Date.now();

                await this.logRecoveryEvent('state-restored', {
                    source: restoration.source,
                    restoredAt: restoration.restoredAt,
                    dataAge: restoration.dataAge
                });

                console.log(`✅ State restored from ${restoration.source}`);
            } else {
                this.recoveryStats.failedRecoveries++;
                console.log('⚠️ State restoration failed, using defaults');
            }

            this.recoveryStats.totalRecoveries++;

            return restoration;

        } catch (error) {
            console.error('❌ State restoration failed:', error);
            this.recoveryStats.failedRecoveries++;
            this.recoveryStats.totalRecoveries++;

            await this.logRecoveryEvent('restoration-failed', {
                error: error.message,
                stack: error.stack
            });

            return { success: false, error: error.message };
        }
    }

    async restoreFromFile(filePath) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            const savedData = JSON.parse(data);

            if (!savedData.state) {
                throw new Error('Invalid state file format');
            }

            // Validate state structure
            const validation = this.validateStateData(savedData.state);
            if (!validation.valid) {
                throw new Error(`Invalid state structure: ${validation.errors.join(', ')}`);
            }

            // Restore state through state manager
            this.stateManager.state = this.stateManager.mergeWithDefaults(
                savedData.state, 
                this.stateManager.defaultState
            );

            // Restore change log if available
            if (savedData.changeLog) {
                this.stateManager.changeLog = savedData.changeLog;
            }

            // Update metadata
            this.stateManager.state.lastUpdate = Date.now();
            this.stateManager.updateSystemHealth();

            const dataAge = Date.now() - new Date(savedData.savedAt).getTime();

            return {
                success: true,
                source: path.basename(filePath),
                restoredAt: savedData.savedAt,
                dataAge: dataAge,
                changeLogSize: savedData.changeLog ? savedData.changeLog.length : 0
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                source: path.basename(filePath)
            };
        }
    }

    async restoreFromBackups() {
        try {
            const backupFiles = await this.getBackupFiles();
            
            for (const backupFile of backupFiles) {
                const restoration = await this.restoreFromFile(backupFile);
                if (restoration.success) {
                    return restoration;
                }
            }

            return { success: false, error: 'No valid backups found' };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getBackupFiles() {
        try {
            const files = await fs.readdir(this.options.backupDir);
            const backupFiles = files
                .filter(file => file.startsWith('state-backup-') && file.endsWith('.json'))
                .map(file => path.join(this.options.backupDir, file))
                .sort((a, b) => {
                    // Sort by modification time, newest first
                    const statA = fs.stat(a);
                    const statB = fs.stat(b);
                    return statB.mtime - statA.mtime;
                });

            return backupFiles;

        } catch (error) {
            console.error('❌ Failed to get backup files:', error);
            return [];
        }
    }

    validateStateData(state) {
        const errors = [];
        const requiredComponents = ['cameras', 'obs', 'windows', 'recovery', 'system'];

        // Check required components
        requiredComponents.forEach(component => {
            if (!state[component]) {
                errors.push(`Missing required component: ${component}`);
            }
        });

        // Validate component structures
        if (state.cameras && !Array.isArray(state.cameras.devices)) {
            errors.push('cameras.devices must be an array');
        }

        if (state.recovery && !Array.isArray(state.recovery.activeOperations)) {
            errors.push('recovery.activeOperations must be an array');
        }

        if (state.system && !state.system.startTime) {
            errors.push('system.startTime is required');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    setupAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }

        this.autoSaveTimer = setInterval(async () => {
            if (!this.shutdownInProgress) {
                await this.saveSystemState('auto-save');
            }
        }, this.options.autoSaveInterval);

        console.log(`⏰ Auto-save enabled (${this.options.autoSaveInterval}ms interval)`);
    }

    setupShutdownHandlers() {
        const gracefulShutdown = async (signal) => {
            if (this.shutdownInProgress) {
                return;
            }

            console.log(`🛑 Graceful shutdown initiated (${signal})`);
            this.shutdownInProgress = true;

            try {
                // Save current state
                await this.saveSystemState('graceful-shutdown');

                // Create shutdown marker
                await this.createShutdownMarker();

                // Remove crash marker
                await this.removeCrashMarker();

                // Save recovery statistics
                await this.saveRecoveryStats();

                // Log shutdown
                await this.logRecoveryEvent('graceful-shutdown', {
                    signal,
                    uptime: Date.now() - this.stateManager.state.system.startTime
                });

                console.log('✅ Graceful shutdown complete');

                // Emit shutdown event
                this.emit('graceful-shutdown', { signal });

            } catch (error) {
                console.error('❌ Error during graceful shutdown:', error);
            }

            process.exit(0);
        };

        // Handle various shutdown signals
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));

        // Handle uncaught exceptions
        process.on('uncaughtException', async (error) => {
            console.error('💥 Uncaught exception:', error);
            
            try {
                await this.saveSystemState('crash-save');
                await this.logRecoveryEvent('uncaught-exception', {
                    error: error.message,
                    stack: error.stack
                });
            } catch (saveError) {
                console.error('❌ Failed to save state during crash:', saveError);
            }

            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', async (reason, promise) => {
            console.error('💥 Unhandled promise rejection:', reason);
            
            try {
                await this.logRecoveryEvent('unhandled-rejection', {
                    reason: reason.toString(),
                    promise: promise.toString()
                });
            } catch (logError) {
                console.error('❌ Failed to log unhandled rejection:', logError);
            }
        });

        console.log('🛡️ Shutdown handlers configured');
    }

    async saveSystemState(source = 'manual') {
        if (this.isSaving) {
            // Add to queue if already saving
            return new Promise((resolve) => {
                this.saveQueue.push({ source, resolve });
            });
        }

        this.isSaving = true;

        try {
            // Create backup before saving
            if (this.lastSaveTime) {
                await this.createBackup();
            }

            // Prepare state data
            const stateData = {
                state: this.stateManager.getState(),
                changeLog: this.stateManager.changeLog.slice(-100), // Keep last 100 changes
                savedAt: new Date().toISOString(),
                source,
                version: '1.0.0',
                processId: process.pid,
                uptime: Date.now() - this.stateManager.state.system.startTime
            };

            // Write state file
            await fs.writeFile(this.stateFile, JSON.stringify(stateData, null, 2));

            this.lastSaveTime = Date.now();

            console.log(`💾 System state saved (${source})`);

            // Emit save event
            this.emit('state-saved', {
                source,
                savedAt: stateData.savedAt,
                size: JSON.stringify(stateData).length
            });

            // Process queued saves
            if (this.saveQueue.length > 0) {
                const queued = this.saveQueue.shift();
                queued.resolve(await this.saveSystemState(queued.source));
            }

            return { success: true, savedAt: stateData.savedAt };

        } catch (error) {
            console.error('❌ Failed to save system state:', error);
            return { success: false, error: error.message };

        } finally {
            this.isSaving = false;
        }
    }

    async createBackup() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(this.options.backupDir, `state-backup-${timestamp}.json`);

            // Copy current state file to backup
            await fs.copyFile(this.stateFile, backupFile);

            // Clean up old backups
            await this.cleanupOldBackups();

            console.log(`📦 State backup created: ${path.basename(backupFile)}`);

        } catch (error) {
            console.error('❌ Failed to create backup:', error);
        }
    }

    async cleanupOldBackups() {
        try {
            const backupFiles = await this.getBackupFiles();

            if (backupFiles.length > this.options.maxBackups) {
                const filesToDelete = backupFiles.slice(this.options.maxBackups);

                for (const file of filesToDelete) {
                    await fs.unlink(file);
                    console.log(`🗑️ Deleted old backup: ${path.basename(file)}`);
                }
            }

        } catch (error) {
            console.error('❌ Failed to cleanup old backups:', error);
        }
    }

    async createCrashMarker() {
        try {
            const crashMarker = {
                timestamp: new Date().toISOString(),
                processId: process.pid,
                uptime: Date.now() - this.stateManager.state.system.startTime,
                nodeVersion: process.version,
                platform: process.platform
            };

            await fs.writeFile(this.crashMarkerFile, JSON.stringify(crashMarker, null, 2));

        } catch (error) {
            console.error('❌ Failed to create crash marker:', error);
        }
    }

    async removeCrashMarker() {
        try {
            await fs.unlink(this.crashMarkerFile);
        } catch (error) {
            // File doesn't exist, that's ok
        }
    }

    async createShutdownMarker() {
        try {
            const shutdownMarker = {
                timestamp: new Date().toISOString(),
                processId: process.pid,
                uptime: Date.now() - this.stateManager.state.system.startTime,
                graceful: true
            };

            await fs.writeFile(this.shutdownMarkerFile, JSON.stringify(shutdownMarker, null, 2));

        } catch (error) {
            console.error('❌ Failed to create shutdown marker:', error);
        }
    }

    async logRecoveryEvent(event, data) {
        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                event,
                data,
                processId: process.pid
            };

            const logLine = JSON.stringify(logEntry) + '\n';
            await fs.appendFile(this.recoveryLogFile, logLine);

        } catch (error) {
            console.error('❌ Failed to log recovery event:', error);
        }
    }

    async loadRecoveryStats() {
        try {
            const statsFile = path.join(this.options.persistenceDir, 'recovery-stats.json');
            const data = await fs.readFile(statsFile, 'utf8');
            this.recoveryStats = { ...this.recoveryStats, ...JSON.parse(data) };

        } catch (error) {
            // Stats file doesn't exist yet, use defaults
        }
    }

    async saveRecoveryStats() {
        try {
            const statsFile = path.join(this.options.persistenceDir, 'recovery-stats.json');
            await fs.writeFile(statsFile, JSON.stringify(this.recoveryStats, null, 2));

        } catch (error) {
            console.error('❌ Failed to save recovery stats:', error);
        }
    }

    async saveConfiguration(config, source = 'manual') {
        try {
            const configData = {
                config,
                savedAt: new Date().toISOString(),
                source,
                version: '1.0.0'
            };

            await fs.writeFile(this.configFile, JSON.stringify(configData, null, 2));

            console.log(`⚙️ Configuration saved (${source})`);

            // Create config backup
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const configBackupFile = path.join(this.options.backupDir, `config-backup-${timestamp}.json`);
            await fs.copyFile(this.configFile, configBackupFile);

            return { success: true, savedAt: configData.savedAt };

        } catch (error) {
            console.error('❌ Failed to save configuration:', error);
            return { success: false, error: error.message };
        }
    }

    async restoreConfiguration() {
        try {
            const data = await fs.readFile(this.configFile, 'utf8');
            const configData = JSON.parse(data);

            return {
                success: true,
                config: configData.config,
                savedAt: configData.savedAt,
                source: configData.source
            };

        } catch (error) {
            console.error('❌ Failed to restore configuration:', error);
            return { success: false, error: error.message };
        }
    }

    async getRecoveryLog(lines = 100) {
        try {
            const data = await fs.readFile(this.recoveryLogFile, 'utf8');
            const logLines = data.trim().split('\n').filter(line => line.length > 0);

            const entries = logLines.slice(-lines).map(line => {
                try {
                    return JSON.parse(line);
                } catch (error) {
                    return { timestamp: new Date().toISOString(), event: 'parse-error', data: { line } };
                }
            });

            return entries.reverse(); // Most recent first

        } catch (error) {
            console.error('❌ Failed to read recovery log:', error);
            return [];
        }
    }

    async getPersistenceStatus() {
        const stats = await Promise.all([
            this.getFileStats(this.stateFile),
            this.getFileStats(this.configFile),
            this.getFileStats(this.recoveryLogFile)
        ]);

        const backupFiles = await this.getBackupFiles();

        return {
            initialized: this.isInitialized,
            lastSaveTime: this.lastSaveTime,
            autoSaveInterval: this.options.autoSaveInterval,
            files: {
                state: stats[0],
                config: stats[1],
                recoveryLog: stats[2]
            },
            backups: {
                count: backupFiles.length,
                maxBackups: this.options.maxBackups,
                totalSize: await this.calculateBackupSize(backupFiles)
            },
            recoveryStats: this.recoveryStats,
            options: this.options
        };
    }

    async getFileStats(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return {
                exists: true,
                size: stats.size,
                modified: stats.mtime,
                created: stats.birthtime
            };
        } catch (error) {
            return {
                exists: false,
                size: 0,
                modified: null,
                created: null
            };
        }
    }

    async calculateBackupSize(backupFiles) {
        let totalSize = 0;
        
        for (const file of backupFiles) {
            try {
                const stats = await fs.stat(file);
                totalSize += stats.size;
            } catch (error) {
                // File might have been deleted, ignore
            }
        }

        return totalSize;
    }

    // Manual save trigger
    async forceSave(source = 'manual') {
        return await this.saveSystemState(source);
    }

    // Manual backup trigger
    async forceBackup() {
        return await this.createBackup();
    }

    // Reset persistence (for testing)
    async resetPersistence() {
        try {
            // Stop auto-save
            if (this.autoSaveTimer) {
                clearInterval(this.autoSaveTimer);
                this.autoSaveTimer = null;
            }

            // Remove all persistence files
            const filesToRemove = [
                this.stateFile,
                this.configFile,
                this.crashMarkerFile,
                this.shutdownMarkerFile,
                this.recoveryLogFile
            ];

            for (const file of filesToRemove) {
                try {
                    await fs.unlink(file);
                } catch (error) {
                    // File doesn't exist, ignore
                }
            }

            // Remove backup files
            const backupFiles = await this.getBackupFiles();
            for (const file of backupFiles) {
                try {
                    await fs.unlink(file);
                } catch (error) {
                    // File doesn't exist, ignore
                }
            }

            // Reset state
            this.lastSaveTime = null;
            this.recoveryStats = {
                totalRecoveries: 0,
                successfulRecoveries: 0,
                failedRecoveries: 0,
                lastRecoveryTime: null,
                crashRecoveries: 0,
                gracefulRestores: 0
            };

            console.log('🔄 Persistence reset complete');

            return { success: true };

        } catch (error) {
            console.error('❌ Failed to reset persistence:', error);
            return { success: false, error: error.message };
        }
    }

    async cleanup() {
        console.log('🧹 Cleaning up state persistence manager...');

        // Stop auto-save
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }

        // Save final state
        if (!this.shutdownInProgress) {
            await this.saveSystemState('cleanup');
        }

        this.isInitialized = false;
        console.log('✅ State persistence manager cleanup complete');
    }
}

module.exports = StatePersistenceManager;