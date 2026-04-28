/**
 * Backend Service Persistence Integration
 * Integrates state persistence and recovery into the main backend service
 */

const StatePersistenceManager = require('./state-persistence-manager');

class BackendPersistenceIntegration {
    constructor(stateManager, logger, options = {}) {
        this.stateManager = stateManager;
        this.logger = logger;
        this.options = {
            persistenceEnabled: options.persistenceEnabled !== false,
            autoSaveInterval: options.autoSaveInterval || 30000,
            maxBackups: options.maxBackups || 10,
            crashRecoveryEnabled: options.crashRecoveryEnabled !== false,
            configBackupEnabled: options.configBackupEnabled !== false,
            ...options
        };

        this.persistenceManager = null;
        this.isInitialized = false;

        console.log('🔗 Backend Persistence Integration initialized');
    }

    async initialize() {
        if (this.isInitialized || !this.options.persistenceEnabled) {
            return;
        }

        try {
            console.log('🚀 Initializing backend persistence integration...');

            // Create persistence manager
            this.persistenceManager = new StatePersistenceManager(this.stateManager, this.options);

            // Setup event handlers
            this.setupEventHandlers();

            // Initialize persistence
            const result = await this.persistenceManager.initialize();

            // Log initialization
            if (this.logger) {
                this.logger.info('Backend persistence integration started', {
                    type: 'persistence',
                    crashRecovery: result.crashRecovery,
                    restoration: result.restoration,
                    recoveryStats: result.recoveryStats
                });
            }

            this.isInitialized = true;
            console.log('✅ Backend persistence integration ready');

            return result;

        } catch (error) {
            console.error('❌ Failed to initialize backend persistence:', error);
            if (this.logger) {
                this.logger.error('Backend persistence initialization failed', { error });
            }
            throw error;
        }
    }

    setupEventHandlers() {
        if (!this.persistenceManager) {
            return;
        }

        // Handle persistence events
        this.persistenceManager.on('initialized', (data) => {
            if (this.logger) {
                this.logger.info('Persistence manager initialized', {
                    type: 'persistence',
                    data
                });
            }
        });

        this.persistenceManager.on('state-saved', (data) => {
            if (this.logger) {
                this.logger.debug('State saved to persistence', {
                    type: 'persistence',
                    source: data.source,
                    savedAt: data.savedAt,
                    size: data.size
                });
            }
        });

        this.persistenceManager.on('graceful-shutdown', (data) => {
            if (this.logger) {
                this.logger.info('Graceful shutdown completed', {
                    type: 'persistence',
                    signal: data.signal
                });
            }
        });

        // Handle state manager events for persistence
        this.stateManager.on('state-changed', async (data) => {
            // Log significant state changes
            if (this.logger && data.changes.length > 0) {
                this.logger.stateChange('system', data.changes, data.newState, {
                    source: data.source,
                    changeCount: data.changes.length
                });
            }
        });

        this.stateManager.on('state-restored', (data) => {
            if (this.logger) {
                this.logger.info('System state restored', {
                    type: 'persistence',
                    restoredAt: data.restoredAt,
                    savedAt: data.savedAt,
                    changeLogSize: data.changeLogSize
                });
            }
        });

        console.log('📡 Persistence event handlers configured');
    }

    // Manual save trigger
    async saveState(source = 'manual') {
        if (!this.persistenceManager) {
            throw new Error('Persistence manager not initialized');
        }

        const result = await this.persistenceManager.saveSystemState(source);

        if (this.logger) {
            if (result.success) {
                this.logger.info('Manual state save completed', {
                    type: 'persistence',
                    source,
                    savedAt: result.savedAt
                });
            } else {
                this.logger.error('Manual state save failed', {
                    type: 'persistence',
                    source,
                    error: result.error
                });
            }
        }

        return result;
    }

    // Manual backup trigger
    async createBackup() {
        if (!this.persistenceManager) {
            throw new Error('Persistence manager not initialized');
        }

        const result = await this.persistenceManager.forceBackup();

        if (this.logger) {
            this.logger.info('Manual backup created', {
                type: 'persistence',
                result
            });
        }

        return result;
    }

    // Configuration persistence
    async saveConfiguration(config, source = 'manual') {
        if (!this.persistenceManager) {
            throw new Error('Persistence manager not initialized');
        }

        const result = await this.persistenceManager.saveConfiguration(config, source);

        if (this.logger) {
            if (result.success) {
                this.logger.info('Configuration saved', {
                    type: 'persistence',
                    source,
                    savedAt: result.savedAt
                });
            } else {
                this.logger.error('Configuration save failed', {
                    type: 'persistence',
                    source,
                    error: result.error
                });
            }
        }

        return result;
    }

    async restoreConfiguration() {
        if (!this.persistenceManager) {
            throw new Error('Persistence manager not initialized');
        }

        const result = await this.persistenceManager.restoreConfiguration();

        if (this.logger) {
            if (result.success) {
                this.logger.info('Configuration restored', {
                    type: 'persistence',
                    savedAt: result.savedAt,
                    source: result.source
                });
            } else {
                this.logger.warn('Configuration restore failed', {
                    type: 'persistence',
                    error: result.error
                });
            }
        }

        return result;
    }

    // Get persistence status
    async getStatus() {
        if (!this.persistenceManager) {
            return {
                enabled: false,
                initialized: false,
                error: 'Persistence manager not initialized'
            };
        }

        const status = await this.persistenceManager.getPersistenceStatus();
        
        return {
            enabled: this.options.persistenceEnabled,
            initialized: this.isInitialized,
            ...status
        };
    }

    // Get recovery log
    async getRecoveryLog(lines = 50) {
        if (!this.persistenceManager) {
            return [];
        }

        return await this.persistenceManager.getRecoveryLog(lines);
    }

    // Get recovery statistics
    getRecoveryStats() {
        if (!this.persistenceManager) {
            return null;
        }

        return this.persistenceManager.recoveryStats;
    }

    // Express.js middleware for persistence status
    createStatusMiddleware() {
        return async (req, res, next) => {
            try {
                const status = await this.getStatus();
                req.persistenceStatus = status;
                next();
            } catch (error) {
                req.persistenceStatus = {
                    enabled: false,
                    initialized: false,
                    error: error.message
                };
                next();
            }
        };
    }

    // API endpoints for persistence management
    createApiRoutes(app) {
        if (!app) {
            throw new Error('Express app instance required');
        }

        // Get persistence status
        app.get('/api/persistence/status', async (req, res) => {
            try {
                const status = await this.getStatus();
                res.json({ success: true, status });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Manual save
        app.post('/api/persistence/save', async (req, res) => {
            try {
                const { source = 'api' } = req.body;
                const result = await this.saveState(source);
                res.json({ success: result.success, result });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Create backup
        app.post('/api/persistence/backup', async (req, res) => {
            try {
                const result = await this.createBackup();
                res.json({ success: true, result });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Save configuration
        app.post('/api/persistence/config', async (req, res) => {
            try {
                const { config, source = 'api' } = req.body;
                if (!config) {
                    return res.status(400).json({ success: false, error: 'Configuration data required' });
                }
                const result = await this.saveConfiguration(config, source);
                res.json({ success: result.success, result });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Restore configuration
        app.get('/api/persistence/config', async (req, res) => {
            try {
                const result = await this.restoreConfiguration();
                res.json({ success: result.success, result });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Get recovery log
        app.get('/api/persistence/recovery-log', async (req, res) => {
            try {
                const { lines = 50 } = req.query;
                const log = await this.getRecoveryLog(parseInt(lines));
                res.json({ success: true, log });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Get recovery statistics
        app.get('/api/persistence/recovery-stats', (req, res) => {
            try {
                const stats = this.getRecoveryStats();
                res.json({ success: true, stats });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        console.log('🛣️ Persistence API routes configured');
    }

    // Health check for persistence
    async healthCheck() {
        if (!this.persistenceManager) {
            return {
                healthy: false,
                error: 'Persistence manager not initialized'
            };
        }

        try {
            const status = await this.getStatus();
            
            return {
                healthy: status.initialized && status.enabled,
                status: status,
                lastSave: this.persistenceManager.lastSaveTime,
                autoSaveEnabled: this.persistenceManager.autoSaveTimer !== null
            };

        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }

    // Cleanup
    async cleanup() {
        console.log('🧹 Cleaning up backend persistence integration...');

        if (this.persistenceManager) {
            await this.persistenceManager.cleanup();
        }

        this.isInitialized = false;
        console.log('✅ Backend persistence integration cleanup complete');
    }
}

module.exports = BackendPersistenceIntegration;