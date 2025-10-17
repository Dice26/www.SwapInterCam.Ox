/**
 * Session Manager
 * Manages chat sessions and persistence
 */

const { app } = require('electron');
const fs = require('fs').promises;
const path = require('path');

class SessionManager {
  constructor() {
    this.currentSession = null;
    this.sessions = new Map();
    this.storageDir = path.join(app.getPath('userData'), 'chat-sessions');
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Ensure storage directory exists
      await fs.mkdir(this.storageDir, { recursive: true });
      
      // Load existing sessions
      await this.loadSessions();
      
      this.initialized = true;
      console.log('✅ Session Manager initialized');
    } catch (error) {
      console.error('Failed to initialize Session Manager:', error);
      throw error;
    }
  }

  async loadSessions() {
    try {
      const files = await fs.readdir(this.storageDir);
      const sessionFiles = files.filter(f => f.endsWith('.json'));

      for (const file of sessionFiles) {
        try {
          const filePath = path.join(this.storageDir, file);
          const data = await fs.readFile(filePath, 'utf8');
          const session = JSON.parse(data);
          this.sessions.set(session.id, session);
        } catch (error) {
          console.error(`Failed to load session ${file}:`, error);
        }
      }

      console.log(`Loaded ${this.sessions.size} sessions`);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }

  async createSession() {
    const session = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      metadata: {
        messageCount: 0,
        lastActivity: new Date().toISOString()
      }
    };

    this.sessions.set(session.id, session);
    this.currentSession = session;
    
    await this.saveSession(session);
    
    return session;
  }

  async getSession(sessionId) {
    if (!sessionId) {
      // Return current session or create new one
      if (!this.currentSession) {
        return await this.createSession();
      }
      return this.currentSession;
    }

    return this.sessions.get(sessionId);
  }

  async getCurrentSession() {
    if (!this.currentSession) {
      // Try to load the most recent session
      const sessions = Array.from(this.sessions.values());
      if (sessions.length > 0) {
        sessions.sort((a, b) => 
          new Date(b.updatedAt) - new Date(a.updatedAt)
        );
        this.currentSession = sessions[0];
      } else {
        // Create new session
        this.currentSession = await this.createSession();
      }
    }

    return this.currentSession;
  }

  async addMessage(sessionId, message) {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    session.messages.push(message);
    session.metadata.messageCount = session.messages.length;
    session.metadata.lastActivity = new Date().toISOString();
    session.updatedAt = new Date().toISOString();

    await this.saveSession(session);

    return session;
  }

  async saveSession(session) {
    try {
      const filePath = path.join(this.storageDir, `${session.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf8');
      this.sessions.set(session.id, session);
    } catch (error) {
      console.error('Failed to save session:', error);
      throw error;
    }
  }

  async deleteSession(sessionId) {
    try {
      const filePath = path.join(this.storageDir, `${sessionId}.json`);
      await fs.unlink(filePath);
      this.sessions.delete(sessionId);
      
      if (this.currentSession && this.currentSession.id === sessionId) {
        this.currentSession = null;
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw error;
    }
  }

  async getAllSessions() {
    return Array.from(this.sessions.values());
  }

  async cleanupOldSessions(maxAge = 30 * 24 * 60 * 60 * 1000) {
    // Clean up sessions older than maxAge (default 30 days)
    const now = Date.now();
    const sessionsToDelete = [];

    for (const [id, session] of this.sessions.entries()) {
      const sessionAge = now - new Date(session.updatedAt).getTime();
      if (sessionAge > maxAge) {
        sessionsToDelete.push(id);
      }
    }

    for (const id of sessionsToDelete) {
      await this.deleteSession(id);
    }

    return sessionsToDelete.length;
  }
}

// Singleton instance
let instance = null;

function getSessionManager() {
  if (!instance) {
    instance = new SessionManager();
  }
  return instance;
}

module.exports = { SessionManager, getSessionManager };
