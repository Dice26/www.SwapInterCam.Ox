/**
 * Enhanced Session Manager with Persistent Storage
 */
class EnhancedSessionManager {
    constructor() {
        this.sessions = new Map();
        this.storageKey = 'swapintercam_chat_sessions';
        this.loadSessions();
    }

    saveSession(appName, sessionData) {
        this.sessions.set(appName, {
            ...sessionData,
            timestamp: Date.now(),
            partition: 'persist:' + appName
        });
        this.persistSessions();
    }

    loadSession(appName) {
        return this.sessions.get(appName) || null;
    }

    clearSession(appName) {
        this.sessions.delete(appName);
        this.persistSessions();
    }

    persistSessions() {
        const sessionData = Object.fromEntries(this.sessions);
        localStorage.setItem(this.storageKey, JSON.stringify(sessionData));
    }

    loadSessions() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const sessionData = JSON.parse(stored);
                this.sessions = new Map(Object.entries(sessionData));
            }
        } catch (error) {
            console.warn('Failed to load sessions:', error);
        }
    }
}

window.sessionManager = new EnhancedSessionManager();