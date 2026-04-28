/**
 * System State Manager - Enhanced state management for backend-centric architecture
 * Handles state persistence, change notifications, and synchronization
 */

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class StateManager extends EventEmitter {
    constructor(stateFile = 'state.json') {
        super();
        this.stateFile = path.resolve(stateFile);
        this.backupFile = this.stateFile + '.backup';
        this.changeLog = [];
        this.maxChangeLogSize = 100;
        
        // Initialize default system state structure
        this.defaultState = {
            cameras: {
                devices: [],
                activeStreams: 0,
                permissions: 'unknown',
                issues: [],
                lastScan: null,
                preferredDevice: null
            },
            obs: {
                connected: false,
                virtualCamera: false,
                currentScene: null,
                availableScenes: [],
                issues: [],
                lastConnection: null
            },
            windows: {
                mainWindow: { 
                    visible: false, 
                    focused: false,
                    position: { x: 0, y: 0 },
                    size: { width: 1400, height: 900 }
                },
                issues: []
            },
            recovery: {
                activeOperations: [],
                lastRun: {},
                statistics: {
                    totalRuns: 0,
                    successfulRuns: 0,
                    failedRuns: 0
                }
            },
            system: {
                startTime: Date.now(),
                version: '1.0.0',
                platform: process.platform,
                nodeVersion: process.version
            },
            health: 'unknown',
            lastUpdate: Date.now(),
            changeCount: 0
        };
        
        // Current system state (single source of truth)
        this.state = { ...this.defaultState };
        
        console.log('🗃️ State Manager initialized');
    }

    /**
     * Get complete system state
     */
    getState() {
        return JSON.parse(JSON.stringify(this.state));
    }

    /**
     * Get specific component state
     */
    getComponentState(component) {
        if (!this.state[component]) {
            throw new Error(`Unknown component: ${component}`);
        }
        return JSON.parse(JSON.stringify(this.state[component]));
    }

    /**
     * Update system state with change tracking and notifications
     */
    updateState(updates, source = 'unknown') {
        const previousState = this.getState();
        const changes = [];
        
        // Apply updates and track changes
        Object.keys(updates).forEach(component => {
            if (!this.state[component]) {
                console.warn(`⚠️ Unknown component in state update: ${component}`);
                return;
            }
            
            const previousComponentState = JSON.parse(JSON.stringify(this.state[component]));
            
            // Merge updates into component state
            if (typeof updates[component] === 'object' && !Array.isArray(updates[component])) {
                Object.assign(this.state[component], updates[component]);
            } else {
                this.state[component] = updates[component];
            }
            
            // Track what changed
            const componentChanges = this.detectChanges(previousComponentState, this.state[component]);
            if (componentChanges.length > 0) {
                changes.push({
                    component,
                    changes: componentChanges,
                    previous: previousComponentState,
                    current: JSON.parse(JSON.stringify(this.state[component]))
                });
            }
        });
        
        // Update metadata
        this.state.lastUpdate = Date.now();
        this.state.changeCount++;
        
        // Update system health
        this.updateSystemHealth();
        
        // Log changes
        if (changes.length > 0) {
            const changeEntry = {
                timestamp: Date.now(),
                source,
                changes,
                health: this.state.health
            };
            
            this.addToChangeLog(changeEntry);
            
            console.log(`📝 State updated by ${source}:`, 
                changes.map(c => `${c.component}(${c.changes.length} changes)`).join(', '));
            
            // Emit change events
            this.emit('state-changed', {
                changes,
                newState: this.getState(),
                previousState,
                source
            });
            
            // Emit component-specific events
            changes.forEach(change => {
                this.emit(`${change.component}-changed`, {
                    component: change.component,
                    changes: change.changes,
                    current: change.current,
                    previous: change.previous,
                    source
                });
            });
        }
        
        return {
            success: true,
            changesDetected: changes.length,
            changes: changes.map(c => ({
                component: c.component,
                changeCount: c.changes.length
            }))
        };
    }

    /**
     * Set specific component state
     */
    setComponentState(component, newState, source = 'unknown') {
        return this.updateState({ [component]: newState }, source);
    }

    /**
     * Add issue to component
     */
    addIssue(component, issue, severity = 'warning') {
        if (!this.state[component] || !Array.isArray(this.state[component].issues)) {
            throw new Error(`Component ${component} does not support issues`);
        }
        
        const issueObj = {
            message: issue,
            severity,
            timestamp: Date.now(),
            id: Math.random().toString(36).substr(2, 9)
        };
        
        // Avoid duplicate issues
        const existingIssue = this.state[component].issues.find(i => i.message === issue);
        if (!existingIssue) {
            this.state[component].issues.push(issueObj);
            this.updateState({ [component]: { issues: this.state[component].issues } }, 'issue-detection');
            
            console.log(`⚠️ Issue added to ${component}: ${issue}`);
        }
        
        return issueObj;
    }

    /**
     * Remove issue from component
     */
    removeIssue(component, issueId) {
        if (!this.state[component] || !Array.isArray(this.state[component].issues)) {
            throw new Error(`Component ${component} does not support issues`);
        }
        
        const initialLength = this.state[component].issues.length;
        this.state[component].issues = this.state[component].issues.filter(i => i.id !== issueId);
        
        if (this.state[component].issues.length < initialLength) {
            this.updateState({ [component]: { issues: this.state[component].issues } }, 'issue-resolution');
            console.log(`✅ Issue removed from ${component}: ${issueId}`);
            return true;
        }
        
        return false;
    }

    /**
     * Clear all issues for component
     */
    clearIssues(component) {
        if (!this.state[component] || !Array.isArray(this.state[component].issues)) {
            throw new Error(`Component ${component} does not support issues`);
        }
        
        const clearedCount = this.state[component].issues.length;
        this.state[component].issues = [];
        this.updateState({ [component]: { issues: [] } }, 'issue-clearing');
        
        console.log(`🧹 Cleared ${clearedCount} issues from ${component}`);
        return clearedCount;
    }

    /**
     * Update system health based on component states
     */
    updateSystemHealth() {
        const allIssues = [];
        
        // Collect all issues from all components
        Object.keys(this.state).forEach(component => {
            if (this.state[component] && Array.isArray(this.state[component].issues)) {
                allIssues.push(...this.state[component].issues);
            }
        });
        
        // Determine overall health
        if (allIssues.length === 0) {
            this.state.health = 'healthy';
        } else {
            const criticalIssues = allIssues.filter(i => i.severity === 'critical' || i.severity === 'error');
            if (criticalIssues.length > 0) {
                this.state.health = 'error';
            } else {
                this.state.health = 'warning';
            }
        }
    }

    /**
     * Detect changes between two objects
     */
    detectChanges(previous, current, path = '') {
        const changes = [];
        
        // Handle arrays
        if (Array.isArray(previous) && Array.isArray(current)) {
            if (JSON.stringify(previous) !== JSON.stringify(current)) {
                changes.push({
                    path: path || 'root',
                    type: 'array-change',
                    previous: previous.length,
                    current: current.length,
                    details: 'Array contents changed'
                });
            }
            return changes;
        }
        
        // Handle objects
        if (typeof previous === 'object' && typeof current === 'object' && previous !== null && current !== null) {
            const allKeys = new Set([...Object.keys(previous), ...Object.keys(current)]);
            
            allKeys.forEach(key => {
                const newPath = path ? `${path}.${key}` : key;
                
                if (!(key in previous)) {
                    changes.push({
                        path: newPath,
                        type: 'added',
                        current: current[key]
                    });
                } else if (!(key in current)) {
                    changes.push({
                        path: newPath,
                        type: 'removed',
                        previous: previous[key]
                    });
                } else if (typeof previous[key] === 'object' && typeof current[key] === 'object') {
                    changes.push(...this.detectChanges(previous[key], current[key], newPath));
                } else if (previous[key] !== current[key]) {
                    changes.push({
                        path: newPath,
                        type: 'modified',
                        previous: previous[key],
                        current: current[key]
                    });
                }
            });
        } else if (previous !== current) {
            changes.push({
                path: path || 'root',
                type: 'value-change',
                previous,
                current
            });
        }
        
        return changes;
    }

    /**
     * Add entry to change log
     */
    addToChangeLog(entry) {
        this.changeLog.push(entry);
        
        // Keep log size manageable
        if (this.changeLog.length > this.maxChangeLogSize) {
            this.changeLog = this.changeLog.slice(-this.maxChangeLogSize);
        }
    }

    /**
     * Get change history
     */
    getChangeHistory(limit = 20) {
        return this.changeLog.slice(-limit).reverse();
    }

    /**
     * Get system statistics
     */
    getStatistics() {
        const uptime = Date.now() - this.state.system.startTime;
        const allIssues = [];
        
        Object.keys(this.state).forEach(component => {
            if (this.state[component] && Array.isArray(this.state[component].issues)) {
                allIssues.push(...this.state[component].issues);
            }
        });
        
        return {
            uptime,
            uptimeFormatted: this.formatUptime(uptime),
            totalChanges: this.state.changeCount,
            currentIssues: allIssues.length,
            health: this.state.health,
            lastUpdate: this.state.lastUpdate,
            changeLogSize: this.changeLog.length,
            components: Object.keys(this.state).filter(k => 
                typeof this.state[k] === 'object' && 
                k !== 'system' && 
                this.state[k] !== null
            ).length
        };
    }

    /**
     * Persist state to file
     */
    async persistState() {
        try {
            // Create backup of current state file
            try {
                await fs.copyFile(this.stateFile, this.backupFile);
            } catch (error) {
                // Backup file doesn't exist yet, that's ok
            }
            
            // Write new state
            const stateData = {
                state: this.state,
                changeLog: this.changeLog.slice(-50), // Keep last 50 changes
                savedAt: new Date().toISOString(),
                version: '1.0.0'
            };
            
            await fs.writeFile(this.stateFile, JSON.stringify(stateData, null, 2));
            console.log('💾 System state persisted to disk');
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Failed to persist state:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Restore state from file
     */
    async restoreState() {
        try {
            const data = await fs.readFile(this.stateFile, 'utf8');
            const savedData = JSON.parse(data);
            
            if (savedData.state) {
                // Merge saved state with default state to handle new fields
                this.state = this.mergeWithDefaults(savedData.state, this.defaultState);
                
                // Restore change log if available
                if (savedData.changeLog) {
                    this.changeLog = savedData.changeLog;
                }
                
                // Update metadata
                this.state.lastUpdate = Date.now();
                this.updateSystemHealth();
                
                console.log(`📂 System state restored from ${savedData.savedAt || 'previous session'}`);
                
                // Emit restoration event
                this.emit('state-restored', {
                    restoredAt: Date.now(),
                    savedAt: savedData.savedAt,
                    changeLogSize: this.changeLog.length
                });
                
                return { success: true, restoredFrom: savedData.savedAt };
            }
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('📂 No previous state found, starting with defaults');
                return { success: true, restoredFrom: null };
            }
            
            console.error('❌ Failed to restore state:', error);
            
            // Try backup file
            try {
                const backupData = await fs.readFile(this.backupFile, 'utf8');
                const savedData = JSON.parse(backupData);
                
                if (savedData.state) {
                    this.state = this.mergeWithDefaults(savedData.state, this.defaultState);
                    console.log('📂 System state restored from backup');
                    return { success: true, restoredFrom: 'backup' };
                }
            } catch (backupError) {
                console.error('❌ Backup restoration also failed:', backupError);
            }
            
            return { success: false, error: error.message };
        }
    }

    /**
     * Merge saved state with default state to handle schema changes
     */
    mergeWithDefaults(savedState, defaultState) {
        const merged = JSON.parse(JSON.stringify(defaultState));
        
        Object.keys(savedState).forEach(key => {
            if (key in merged) {
                if (typeof merged[key] === 'object' && !Array.isArray(merged[key]) && merged[key] !== null) {
                    merged[key] = { ...merged[key], ...savedState[key] };
                } else {
                    merged[key] = savedState[key];
                }
            }
        });
        
        return merged;
    }

    /**
     * Reset state to defaults
     */
    resetState(component = null) {
        if (component) {
            if (!this.defaultState[component]) {
                throw new Error(`Unknown component: ${component}`);
            }
            
            this.state[component] = JSON.parse(JSON.stringify(this.defaultState[component]));
            this.updateState({ [component]: this.state[component] }, 'reset');
            
            console.log(`🔄 Component ${component} reset to defaults`);
        } else {
            this.state = JSON.parse(JSON.stringify(this.defaultState));
            this.state.system.startTime = Date.now();
            this.changeLog = [];
            
            console.log('🔄 Complete system state reset to defaults');
            
            this.emit('state-reset', {
                resetAt: Date.now(),
                component: null
            });
        }
    }

    /**
     * Format uptime duration
     */
    formatUptime(uptime) {
        const seconds = Math.floor(uptime / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Validate state structure
     */
    validateState() {
        const errors = [];
        const requiredComponents = ['cameras', 'obs', 'windows', 'recovery', 'system'];
        
        requiredComponents.forEach(component => {
            if (!this.state[component]) {
                errors.push(`Missing required component: ${component}`);
            }
        });
        
        // Validate specific component structures
        if (this.state.cameras && !Array.isArray(this.state.cameras.devices)) {
            errors.push('cameras.devices must be an array');
        }
        
        if (this.state.recovery && !Array.isArray(this.state.recovery.activeOperations)) {
            errors.push('recovery.activeOperations must be an array');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get state diff between current and previous
     */
    getStateDiff(previousState) {
        return this.detectChanges(previousState, this.state);
    }

    /**
     * Subscribe to state changes
     */
    onStateChange(callback) {
        this.on('state-changed', callback);
        return () => this.off('state-changed', callback);
    }

    /**
     * Subscribe to component changes
     */
    onComponentChange(component, callback) {
        this.on(`${component}-changed`, callback);
        return () => this.off(`${component}-changed`, callback);
    }
}

module.exports = StateManager;