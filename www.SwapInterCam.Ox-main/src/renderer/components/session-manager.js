// Session Manager - Handles persistent login sessions for each chat application

class SessionManager {
    constructor() {
        this.sessions = new Map();
        this.autoSaveInterval = 30000; // 30 seconds
        this.autoSaveTimer = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        console.log('Initializing Session Manager...');

        try {
            // Load existing sessions
            await this.loadAllSessions();
            
            // Start auto-save timer
            this.startAutoSave();
            
            // Setup cleanup on app close
            this.setupCleanupHandlers();
            
            this.isInitialized = true;
            console.log('Session Manager initialized successfully');
        } catch (error) {
            this.log('Failed to initialize Session Manager:', error);
            throw error;
        }
    }

    async loadAllSessions() {
        const chatApps = ['whatsapp', 'messenger', 'line'];
        
        for (const appName of chatApps) {
            try {
                const result = await window.electronAPI.session.load(appName);
                if (result.success && result.data) {
                    this.sessions.set(appName, {
                        data: result.data,
                        lastUpdated: new Date(),
                        isDirty: false
                    });
                    console.log(`Loaded session for ${appName}`);
                } else {
                    // Initialize empty session
                    this.sessions.set(appName, {
                        data: this.createEmptySession(),
                        lastUpdated: new Date(),
                        isDirty: false
                    });
                }
            } catch (error) {
                this.log(`Failed to load session for ${appName}:`, error);
                // Initialize empty session on error
                this.sessions.set(appName, {
                    data: this.createEmptySession(),
                    lastUpdated: new Date(),
                    isDirty: false
                });
            }
        }
    }

    createEmptySession() {
        return {
            cookies: [],
            localStorage: {},
            sessionStorage: {},
            userAgent: '',
            lastLogin: null,
            preferences: {}
        }
    }

    async saveSession(appName, sessionData) {
        try {
            const session = this.sessions.get(appName) || {
                data: this.createEmptySession(),
                lastUpdated: new Date(),
                isDirty: false
            }
            // Merge new data with existing session
            session.data = { ...session.data, ...sessionData }
            session.lastUpdated = new Date();
            session.isDirty = true;

            this.sessions.set(appName, session);

            // Save to persistent storage
            const result = await window.electronAPI.session.save(appName, session.data);
            
            if (result.success) {
                session.isDirty = false;
                console.log(`Session saved for ${appName}`);
                return true;
            } else {
                this.log(`Failed to save session for ${appName}:`, result.error);
                return false;
            }
        } catch (error) {
            this.log(`Error saving session for ${appName}:`, error);
            return false;
        }
    }

    getSession(appName) {
        const session = this.sessions.get(appName);
        return session ? session.data : this.createEmptySession();
    }

    async clearSession(appName) {
        try {
            // Clear from memory
            this.sessions.set(appName, {
                data: this.createEmptySession(),
                lastUpdated: new Date(),
                isDirty: false
            });

            // Clear from persistent storage
            const result = await window.electronAPI.session.clear(appName);
            
            if (result.success) {
                console.log(`Session cleared for ${appName}`);
                
                // Emit session cleared event
                this.emitSessionEvent('session-cleared', { appName });
                
                return true;
            } else {
                this.handleError('Failed to clear session for ${appName}', new Error('Failed to clear session for ${appName}'));
                return false;
            }
        } catch (error) {
            this.log(`Error clearing session for ${appName}:`, error);
            return false;
        }
    }

    async resetSession(appName) {
        console.log(`Resetting session for ${appName}`);
        
        // Clear session data
        await this.clearSession(appName);
        
        // Reload the webview to start fresh
        const event = new CustomEvent('session-reset-requested', {
            detail: { appName }
        });
        document.dispatchEvent(event);
        
        return true;
    }

    updateSessionData(appName, key, value) {
        const session = this.sessions.get(appName);
        if (session) {
            session.data[key] = value;
            session.lastUpdated = new Date();
            session.isDirty = true;
            
            // Emit session updated event
            this.emitSessionEvent('session-updated', {
                appName, 
                key, 
                value 
            });
        }
    }

    getSessionPartition(appName) {
        return `persist:${appName}`;
    }

    isSessionDirty(appName) {
        const session = this.sessions.get(appName);
        return session ? session.isDirty : false;
    }

    getSessionAge(appName) {
        const session = this.sessions.get(appName);
        if (session && session.data.lastLogin) {
            return Date.now() - new Date(session.data.lastLogin).getTime();
        }
        return null;
    }

    async saveAllDirtySessions() {
        const savePromises = [];
        
        for (const [appName, session] of this.sessions) {
            if (session.isDirty) {
                savePromises.push(this.saveSession(appName, session.data));
            }
        }
        
        if (savePromises.length > 0) {
            console.log(`Saving ${savePromises.length} dirty sessions...`);
            const results = await Promise.all(savePromises);
            const successCount = results.filter(r => r).length;
            console.log(`Saved ${successCount}/${savePromises.length} sessions successfully`);
        }
    }

    startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setInterval(async () => {
            await this.saveAllDirtySessions();
        }, this.autoSaveInterval);
        
        console.log(`Auto-save started with ${this.autoSaveInterval}ms interval`);
    }

    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
            console.log('Auto-save stopped');
        }
    }

    setupCleanupHandlers() {
        // Save sessions before page unload
        window.addEventListener('beforeunload', async (event) => {
            await this.saveAllDirtySessions();
        });

        // Handle visibility change (app minimize/restore)
        document.addEventListener('visibilitychange', async () => {
            if (document.hidden) {
                // App is being hidden, save sessions
                await this.saveAllDirtySessions();
            }
        });
    }

    // Session statistics and monitoring
    getSessionStats() {
        const stats = {}
        for (const [appName, session] of this.sessions) {
            stats[appName] = {
                hasData: Object.keys(session.data).length > 0,
                lastUpdated: session.lastUpdated,
                isDirty: session.isDirty,
                age: this.getSessionAge(appName),
                dataSize: JSON.stringify(session.data).length
            }
        }
        
        return stats;
    }

    // Session backup and restore
    async exportSessions() {
        const exportData = {}
        for (const [appName, session] of this.sessions) {
            exportData[appName] = {
                ...session.data,
                exportedAt: new Date().toISOString()
            }
        }
        
        return exportData;
    }

    async importSessions(importData) {
        for (const [appName, sessionData] of Object.entries(importData)) {
            if (this.sessions.has(appName)) {
                await this.saveSession(appName, sessionData);
                console.log(`Imported session for ${appName}`);
            }
        }
        
        // Emit import completed event
        this.emitSessionEvent('sessions-imported', {
            count: Object.keys(importData).length 
        });
    }

    emitSessionEvent(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
    }

    async destroy() {
        console.log('Destroying Session Manager...');
        
        // Stop auto-save
        this.stopAutoSave();
        
        // Save all dirty sessions one last time
        await this.saveAllDirtySessions();
        
        // Clear memory
        this.sessions.clear();
        this.isInitialized = false;
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] session-manager ${level}: ${message}`;
        
        if (level === 'ERROR') {
            console.warn(logMessage);
        } else {
            console.log(logMessage);
        }
    }
}

// Export for use in main scripts
window.SessionManager = SessionManager;