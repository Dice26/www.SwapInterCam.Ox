/**
 * Issue Detection and Actionable Feedback System
 * Monitors system state, detects issues, and provides actionable solutions
 */

const EventEmitter = require('events');

class IssueDetector extends EventEmitter {
    constructor(stateManager, actionExecutor) {
        super();
        this.stateManager = stateManager;
        this.actionExecutor = actionExecutor;
        this.detectionRules = new Map();
        this.detectedIssues = new Map();
        this.monitoringInterval = null;
        this.monitoringFrequency = 5000; // 5 seconds
        this.issueHistory = [];
        this.maxHistorySize = 500;
        
        this.initializeDetectionRules();
        
        console.log('🔍 Issue Detection System initialized');
    }

    initializeDetectionRules() {
        // Camera-related detection rules
        this.registerDetectionRule('camera-no-devices', {
            category: 'camera',
            severity: 'error',
            description: 'No camera devices detected',
            condition: (state) => {
                const cameras = state.cameras;
                return !cameras.devices || cameras.devices.length === 0;
            },
            message: 'No camera devices found. This may prevent video streaming.',
            suggestion: 'Try scanning for cameras or check camera connections.',
            actions: [
                {
                    id: 'scan-cameras',
                    label: 'Scan for Cameras',
                    action: 'scan-cameras',
                    params: {},
                    primary: true
                }
            ]
        });

        this.registerDetectionRule('camera-no-active-streams', {
            category: 'camera',
            severity: 'warning',
            description: 'No active camera streams',
            condition: (state) => {
                const cameras = state.cameras;
                return cameras.devices && cameras.devices.length > 0 && 
                       cameras.activeStreams === 0 &&
                       Date.now() - (cameras.lastScan || 0) > 60000; // No streams for 1 minute
            },
            message: 'Camera devices are available but no streams are active.',
            suggestion: 'Start a camera stream or check camera permissions.',
            actions: [
                {
                    id: 'fix-camera',
                    label: 'Fix Camera Issues',
                    action: 'fix-camera',
                    params: {},
                    primary: true
                },
                {
                    id: 'scan-cameras',
                    label: 'Rescan Cameras',
                    action: 'scan-cameras',
                    params: {},
                    primary: false
                }
            ]
        });

        this.registerDetectionRule('camera-permission-denied', {
            category: 'camera',
            severity: 'error',
            description: 'Camera permission denied',
            condition: (state) => {
                const cameras = state.cameras;
                return cameras.permissions === 'denied';
            },
            message: 'Camera access has been denied by the system.',
            suggestion: 'Grant camera permissions in system settings or browser.',
            actions: [
                {
                    id: 'fix-camera',
                    label: 'Fix Camera Permissions',
                    action: 'fix-camera',
                    params: {},
                    primary: true
                }
            ]
        });

        // OBS-related detection rules
        this.registerDetectionRule('obs-not-connected', {
            category: 'obs',
            severity: 'warning',
            description: 'OBS Studio not connected',
            condition: (state) => {
                const obs = state.obs;
                return !obs.connected;
            },
            message: 'OBS Studio is not connected. Video streaming features may be limited.',
            suggestion: 'Start OBS Studio and ensure WebSocket server is enabled.',
            actions: [
                {
                    id: 'reconnect-obs',
                    label: 'Reconnect to OBS',
                    action: 'reconnect-obs',
                    params: {},
                    primary: true
                }
            ]
        });

        this.registerDetectionRule('obs-virtual-camera-inactive', {
            category: 'obs',
            severity: 'warning',
            description: 'OBS Virtual Camera not active',
            condition: (state) => {
                const obs = state.obs;
                return obs.connected && !obs.virtualCamera;
            },
            message: 'OBS is connected but Virtual Camera is not active.',
            suggestion: 'Start the Virtual Camera in OBS Studio.',
            actions: [
                {
                    id: 'restart-obs-virtual-camera',
                    label: 'Start Virtual Camera',
                    action: 'restart-obs-virtual-camera',
                    params: {},
                    primary: true
                }
            ]
        });

        this.registerDetectionRule('obs-connection-timeout', {
            category: 'obs',
            severity: 'error',
            description: 'OBS connection timeout',
            condition: (state) => {
                const obs = state.obs;
                return obs.connected && obs.lastConnection && 
                       Date.now() - obs.lastConnection > 120000; // 2 minutes timeout
            },
            message: 'OBS connection has timed out and may be unstable.',
            suggestion: 'Reconnect to OBS Studio to restore stable connection.',
            actions: [
                {
                    id: 'reconnect-obs',
                    label: 'Reconnect to OBS',
                    action: 'reconnect-obs',
                    params: {},
                    primary: true
                }
            ]
        });

        // Window-related detection rules
        this.registerDetectionRule('window-hidden', {
            category: 'window',
            severity: 'info',
            description: 'Main window is hidden',
            condition: (state) => {
                const windows = state.windows;
                return windows.mainWindow && !windows.mainWindow.visible;
            },
            message: 'The main application window is currently hidden.',
            suggestion: 'Show the window to access application features.',
            actions: [
                {
                    id: 'show-window',
                    label: 'Show Window',
                    action: 'show-window',
                    params: {},
                    primary: true
                }
            ]
        });

        this.registerDetectionRule('window-minimized', {
            category: 'window',
            severity: 'info',
            description: 'Main window is minimized',
            condition: (state) => {
                const windows = state.windows;
                return windows.mainWindow && windows.mainWindow.visible && 
                       windows.mainWindow.minimized;
            },
            message: 'The main application window is minimized.',
            suggestion: 'Restore the window to access application features.',
            actions: [
                {
                    id: 'restore-window',
                    label: 'Restore Window',
                    action: 'restore-window',
                    params: {},
                    primary: true
                }
            ]
        });

        // System-wide detection rules
        this.registerDetectionRule('multiple-critical-issues', {
            category: 'system',
            severity: 'critical',
            description: 'Multiple critical issues detected',
            condition: (state) => {
                let criticalIssues = 0;
                Object.keys(state).forEach(component => {
                    if (state[component] && Array.isArray(state[component].issues)) {
                        criticalIssues += state[component].issues.filter(
                            issue => issue.severity === 'error' || issue.severity === 'critical'
                        ).length;
                    }
                });
                return criticalIssues >= 3;
            },
            message: 'Multiple critical issues are affecting system functionality.',
            suggestion: 'Run automatic recovery to resolve all detected issues.',
            actions: [
                {
                    id: 'auto-recover',
                    label: 'Auto Recover All',
                    action: 'auto-recover',
                    params: {},
                    primary: true
                },
                {
                    id: 'restart-system',
                    label: 'Restart System',
                    action: 'restart-system',
                    params: {},
                    primary: false
                }
            ]
        });

        this.registerDetectionRule('system-degraded', {
            category: 'system',
            severity: 'warning',
            description: 'System performance degraded',
            condition: (state) => {
                // Check if multiple components have issues
                let componentsWithIssues = 0;
                ['cameras', 'obs', 'windows'].forEach(component => {
                    if (state[component] && Array.isArray(state[component].issues) && 
                        state[component].issues.length > 0) {
                        componentsWithIssues++;
                    }
                });
                return componentsWithIssues >= 2;
            },
            message: 'Multiple system components are experiencing issues.',
            suggestion: 'Consider running system recovery to restore optimal performance.',
            actions: [
                {
                    id: 'auto-recover',
                    label: 'Auto Recover',
                    action: 'auto-recover',
                    params: {},
                    primary: true
                },
                {
                    id: 'force-state-refresh',
                    label: 'Refresh System State',
                    action: 'force-state-refresh',
                    params: {},
                    primary: false
                }
            ]
        });

        console.log(`🔍 Registered ${this.detectionRules.size} detection rules`);
    }

    registerDetectionRule(id, rule) {
        this.detectionRules.set(id, {
            id,
            ...rule,
            registeredAt: Date.now()
        });
    }

    startMonitoring() {
        if (this.monitoringInterval) {
            console.log('🔍 Issue monitoring already running');
            return;
        }

        console.log(`🔍 Starting issue monitoring (every ${this.monitoringFrequency}ms)`);
        
        this.monitoringInterval = setInterval(() => {
            this.detectIssues();
        }, this.monitoringFrequency);

        // Run initial detection
        this.detectIssues();
    }

    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('🔍 Issue monitoring stopped');
        }
    }

    detectIssues() {
        const currentState = this.stateManager.getState();
        const detectedIssues = new Map();
        const newIssues = [];
        const resolvedIssues = [];

        // Run all detection rules
        this.detectionRules.forEach((rule, ruleId) => {
            try {
                if (rule.condition(currentState)) {
                    const issue = this.createSystemIssue(rule, currentState);
                    detectedIssues.set(ruleId, issue);

                    // Check if this is a new issue
                    if (!this.detectedIssues.has(ruleId)) {
                        newIssues.push(issue);
                        console.log(`🚨 New issue detected: ${issue.message}`);
                    }
                }
            } catch (error) {
                console.error(`❌ Error in detection rule ${ruleId}:`, error);
            }
        });

        // Check for resolved issues
        this.detectedIssues.forEach((issue, ruleId) => {
            if (!detectedIssues.has(ruleId)) {
                resolvedIssues.push(issue);
                console.log(`✅ Issue resolved: ${issue.message}`);
            }
        });

        // Update detected issues
        this.detectedIssues = detectedIssues;

        // Update issue history
        if (newIssues.length > 0 || resolvedIssues.length > 0) {
            this.updateIssueHistory(newIssues, resolvedIssues);
        }

        // Emit events for new and resolved issues
        if (newIssues.length > 0) {
            this.emit('issues-detected', newIssues);
        }
        
        if (resolvedIssues.length > 0) {
            this.emit('issues-resolved', resolvedIssues);
        }

        // Update system state with current issues
        this.updateSystemStateWithIssues(currentState, detectedIssues);
    }

    createSystemIssue(rule, currentState) {
        return {
            id: rule.id,
            category: rule.category,
            severity: rule.severity,
            message: rule.message,
            suggestion: rule.suggestion,
            description: rule.description,
            actions: rule.actions.map(action => ({
                ...action,
                id: `${rule.id}_${action.id}`,
                available: this.isActionAvailable(action.action)
            })),
            detectedAt: Date.now(),
            context: this.extractRelevantContext(rule.category, currentState)
        };
    }

    isActionAvailable(actionName) {
        const availableActions = this.actionExecutor.getAvailableActions();
        return availableActions.hasOwnProperty(actionName);
    }

    extractRelevantContext(category, state) {
        const context = { category };
        
        switch (category) {
            case 'camera':
                context.cameras = {
                    deviceCount: state.cameras.devices?.length || 0,
                    activeStreams: state.cameras.activeStreams || 0,
                    permissions: state.cameras.permissions,
                    lastScan: state.cameras.lastScan
                };
                break;
                
            case 'obs':
                context.obs = {
                    connected: state.obs.connected,
                    virtualCamera: state.obs.virtualCamera,
                    currentScene: state.obs.currentScene,
                    lastConnection: state.obs.lastConnection
                };
                break;
                
            case 'window':
                context.windows = {
                    visible: state.windows.mainWindow?.visible,
                    focused: state.windows.mainWindow?.focused,
                    minimized: state.windows.mainWindow?.minimized
                };
                break;
                
            case 'system':
                context.system = {
                    totalIssues: this.getTotalIssueCount(state),
                    criticalIssues: this.getCriticalIssueCount(state),
                    componentsAffected: this.getAffectedComponents(state)
                };
                break;
        }
        
        return context;
    }

    getTotalIssueCount(state) {
        let total = 0;
        Object.keys(state).forEach(component => {
            if (state[component] && Array.isArray(state[component].issues)) {
                total += state[component].issues.length;
            }
        });
        return total;
    }

    getCriticalIssueCount(state) {
        let critical = 0;
        Object.keys(state).forEach(component => {
            if (state[component] && Array.isArray(state[component].issues)) {
                critical += state[component].issues.filter(
                    issue => issue.severity === 'error' || issue.severity === 'critical'
                ).length;
            }
        });
        return critical;
    }

    getAffectedComponents(state) {
        const affected = [];
        ['cameras', 'obs', 'windows'].forEach(component => {
            if (state[component] && Array.isArray(state[component].issues) && 
                state[component].issues.length > 0) {
                affected.push(component);
            }
        });
        return affected;
    }

    updateIssueHistory(newIssues, resolvedIssues) {
        const historyEntry = {
            timestamp: Date.now(),
            newIssues: newIssues.map(issue => ({
                id: issue.id,
                category: issue.category,
                severity: issue.severity,
                message: issue.message
            })),
            resolvedIssues: resolvedIssues.map(issue => ({
                id: issue.id,
                category: issue.category,
                severity: issue.severity,
                message: issue.message,
                duration: Date.now() - issue.detectedAt
            }))
        };

        this.issueHistory.unshift(historyEntry);
        
        if (this.issueHistory.length > this.maxHistorySize) {
            this.issueHistory = this.issueHistory.slice(0, this.maxHistorySize);
        }
    }

    updateSystemStateWithIssues(currentState, detectedIssues) {
        // Convert detected issues to the format expected by state manager
        const issuesByComponent = {
            cameras: [],
            obs: [],
            windows: [],
            system: []
        };

        detectedIssues.forEach(issue => {
            const component = issue.category === 'system' ? 'recovery' : issue.category + 's';
            if (issuesByComponent[component] !== undefined) {
                issuesByComponent[component].push({
                    id: issue.id,
                    message: issue.message,
                    severity: issue.severity,
                    suggestion: issue.suggestion,
                    actions: issue.actions,
                    detectedAt: issue.detectedAt,
                    context: issue.context
                });
            }
        });

        // Update state manager with detected issues
        Object.keys(issuesByComponent).forEach(component => {
            if (issuesByComponent[component].length > 0) {
                // Clear existing issues and add new ones
                try {
                    this.stateManager.clearIssues(component);
                    issuesByComponent[component].forEach(issue => {
                        this.stateManager.addIssue(component, issue.message, issue.severity, issue);
                    });
                } catch (error) {
                    console.warn(`Failed to update issues for ${component}:`, error.message);
                }
            }
        });
    }

    // Public API methods

    getCurrentIssues() {
        return Array.from(this.detectedIssues.values());
    }

    getIssuesByCategory(category) {
        return Array.from(this.detectedIssues.values()).filter(
            issue => issue.category === category
        );
    }

    getIssuesBySeverity(severity) {
        return Array.from(this.detectedIssues.values()).filter(
            issue => issue.severity === severity
        );
    }

    getIssueHistory(limit = 50) {
        return this.issueHistory.slice(0, limit);
    }

    getIssueStatistics() {
        const currentIssues = this.getCurrentIssues();
        const categories = {};
        const severities = {};

        currentIssues.forEach(issue => {
            categories[issue.category] = (categories[issue.category] || 0) + 1;
            severities[issue.severity] = (severities[issue.severity] || 0) + 1;
        });

        // Calculate resolution statistics from history
        let totalDetected = 0;
        let totalResolved = 0;
        let totalDuration = 0;
        let resolvedCount = 0;

        this.issueHistory.forEach(entry => {
            totalDetected += entry.newIssues.length;
            totalResolved += entry.resolvedIssues.length;
            
            entry.resolvedIssues.forEach(resolved => {
                totalDuration += resolved.duration;
                resolvedCount++;
            });
        });

        const averageResolutionTime = resolvedCount > 0 ? totalDuration / resolvedCount : 0;

        return {
            current: {
                total: currentIssues.length,
                categories,
                severities
            },
            history: {
                totalDetected,
                totalResolved,
                resolutionRate: totalDetected > 0 ? (totalResolved / totalDetected * 100).toFixed(2) : 0,
                averageResolutionTime: Math.round(averageResolutionTime)
            },
            monitoring: {
                active: !!this.monitoringInterval,
                frequency: this.monitoringFrequency,
                rulesCount: this.detectionRules.size
            }
        };
    }

    async executeIssueAction(issueId, actionId) {
        const issue = this.detectedIssues.get(issueId);
        if (!issue) {
            return {
                success: false,
                message: `Issue ${issueId} not found`
            };
        }

        const action = issue.actions.find(a => a.id === actionId);
        if (!action) {
            return {
                success: false,
                message: `Action ${actionId} not found for issue ${issueId}`
            };
        }

        if (!action.available) {
            return {
                success: false,
                message: `Action ${action.action} is not available`
            };
        }

        console.log(`🔧 Executing action ${action.action} for issue ${issueId}`);

        try {
            const result = await this.actionExecutor.executeAction(action.action, action.params);
            
            // Track action execution for this issue
            this.emit('issue-action-executed', {
                issueId,
                actionId,
                action: action.action,
                result
            });

            return result;
        } catch (error) {
            console.error(`❌ Failed to execute action ${action.action} for issue ${issueId}:`, error);
            return {
                success: false,
                message: `Action execution failed: ${error.message}`
            };
        }
    }

    getDetectionRules() {
        const rules = {};
        this.detectionRules.forEach((rule, id) => {
            rules[id] = {
                id: rule.id,
                category: rule.category,
                severity: rule.severity,
                description: rule.description,
                registeredAt: rule.registeredAt
            };
        });
        return rules;
    }

    // Cleanup
    cleanup() {
        console.log('🧹 Cleaning up Issue Detection System...');
        this.stopMonitoring();
        this.detectedIssues.clear();
        this.removeAllListeners();
    }
}

module.exports = IssueDetector;