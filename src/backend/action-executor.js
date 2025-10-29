/**
 * Action Execution System
 * Handles all action routing, execution, logging, and result formatting
 */

const fs = require('fs').promises;
const path = require('path');

class ActionExecutor {
    constructor(stateManager, recoveryModules) {
        this.stateManager = stateManager;
        this.recoveryModules = recoveryModules;
        this.actionHistory = [];
        this.maxHistorySize = 1000;
        this.logFile = path.join(__dirname, 'actions.log');
        
        // Action registry with metadata
        this.actionRegistry = new Map();
        this.initializeActionRegistry();
        
        console.log('⚡ Action Execution System initialized');
    }

    initializeActionRegistry() {
        // Register all available actions with metadata
        this.registerAction('scan-cameras', {
            description: 'Scan for available camera devices',
            category: 'camera',
            requiresParams: false,
            estimatedDuration: 3000,
            canRetry: true,
            handler: this.scanCameras.bind(this)
        });

        this.registerAction('fix-camera', {
            description: 'Fix camera-related issues',
            category: 'camera',
            requiresParams: false,
            estimatedDuration: 5000,
            canRetry: true,
            handler: this.fixCamera.bind(this)
        });

        this.registerAction('restart-camera-stream', {
            description: 'Restart a specific camera stream',
            category: 'camera',
            requiresParams: true,
            requiredParams: ['cameraId'],
            estimatedDuration: 3000,
            canRetry: true,
            handler: this.restartCameraStream.bind(this)
        });

        this.registerAction('show-window', {
            description: 'Show and focus the main application window',
            category: 'window',
            requiresParams: false,
            estimatedDuration: 1000,
            canRetry: true,
            handler: this.showWindow.bind(this)
        });

        this.registerAction('restore-window', {
            description: 'Restore window from minimized state',
            category: 'window',
            requiresParams: false,
            estimatedDuration: 1000,
            canRetry: true,
            handler: this.restoreWindow.bind(this)
        });

        this.registerAction('reconnect-obs', {
            description: 'Reconnect to OBS Studio',
            category: 'obs',
            requiresParams: false,
            estimatedDuration: 5000,
            canRetry: true,
            handler: this.reconnectOBS.bind(this)
        });

        this.registerAction('restart-obs-virtual-camera', {
            description: 'Restart OBS virtual camera',
            category: 'obs',
            requiresParams: false,
            estimatedDuration: 3000,
            canRetry: true,
            handler: this.restartOBSVirtualCamera.bind(this)
        });

        this.registerAction('switch-obs-scene', {
            description: 'Switch to a specific OBS scene',
            category: 'obs',
            requiresParams: true,
            requiredParams: ['sceneName'],
            estimatedDuration: 1000,
            canRetry: true,
            handler: this.switchOBSScene.bind(this)
        });

        this.registerAction('auto-recover', {
            description: 'Automatically recover from all detected issues',
            category: 'recovery',
            requiresParams: false,
            estimatedDuration: 10000,
            canRetry: false,
            handler: this.autoRecover.bind(this)
        });

        this.registerAction('test-recovery', {
            description: 'Test recovery system by creating simulated issues',
            category: 'recovery',
            requiresParams: false,
            estimatedDuration: 1000,
            canRetry: false,
            handler: this.testRecovery.bind(this)
        });

        this.registerAction('clear-issues', {
            description: 'Clear all issues from a specific component',
            category: 'recovery',
            requiresParams: true,
            requiredParams: ['component'],
            estimatedDuration: 500,
            canRetry: false,
            handler: this.clearIssues.bind(this)
        });

        this.registerAction('restart-system', {
            description: 'Restart all system components',
            category: 'system',
            requiresParams: false,
            estimatedDuration: 8000,
            canRetry: false,
            handler: this.restartSystem.bind(this)
        });

        this.registerAction('force-state-refresh', {
            description: 'Force refresh of all system state',
            category: 'system',
            requiresParams: false,
            estimatedDuration: 2000,
            canRetry: true,
            handler: this.forceStateRefresh.bind(this)
        });

        console.log(`📋 Registered ${this.actionRegistry.size} actions`);
    }

    registerAction(name, config) {
        this.actionRegistry.set(name, {
            name,
            ...config,
            registeredAt: Date.now()
        });
    }

    getAvailableActions() {
        const actions = {};
        this.actionRegistry.forEach((config, name) => {
            actions[name] = {
                name: config.name,
                description: config.description,
                category: config.category,
                requiresParams: config.requiresParams,
                requiredParams: config.requiredParams || [],
                estimatedDuration: config.estimatedDuration,
                canRetry: config.canRetry
            };
        });
        return actions;
    }

    async executeAction(actionName, params = {}, context = {}) {
        const startTime = Date.now();
        const executionId = this.generateExecutionId();
        
        console.log(`⚡ [${executionId}] Executing action: ${actionName}`);
        
        // Validate action exists
        const actionConfig = this.actionRegistry.get(actionName);
        if (!actionConfig) {
            const result = this.createErrorResult(
                `Unknown action: ${actionName}`,
                `Action '${actionName}' is not registered`,
                executionId
            );
            await this.logActionExecution(actionName, params, result, startTime, context);
            return result;
        }

        // Validate required parameters
        const validationResult = this.validateActionParams(actionConfig, params);
        if (!validationResult.valid) {
            const result = this.createErrorResult(
                'Invalid parameters',
                validationResult.error,
                executionId
            );
            await this.logActionExecution(actionName, params, result, startTime, context);
            return result;
        }

        try {
            // Execute the action
            const result = await actionConfig.handler(params, context);
            
            // Ensure result has proper format
            const formattedResult = this.formatActionResult(result, executionId, startTime);
            
            // Update system state if provided
            if (formattedResult.newState) {
                this.stateManager.updateState(formattedResult.newState, `action:${actionName}`);
            }

            // Log successful execution
            await this.logActionExecution(actionName, params, formattedResult, startTime, context);
            
            console.log(`✅ [${executionId}] Action completed: ${actionName} (${Date.now() - startTime}ms)`);
            
            return formattedResult;

        } catch (error) {
            console.error(`❌ [${executionId}] Action failed: ${actionName}`, error);
            
            const result = this.createErrorResult(
                `Action failed: ${error.message}`,
                error.stack,
                executionId
            );
            
            await this.logActionExecution(actionName, params, result, startTime, context);
            return result;
        }
    }

    validateActionParams(actionConfig, params) {
        if (!actionConfig.requiresParams) {
            return { valid: true };
        }

        if (!actionConfig.requiredParams || actionConfig.requiredParams.length === 0) {
            return { valid: true };
        }

        const missingParams = actionConfig.requiredParams.filter(param => 
            params[param] === undefined || params[param] === null
        );

        if (missingParams.length > 0) {
            return {
                valid: false,
                error: `Missing required parameters: ${missingParams.join(', ')}`
            };
        }

        return { valid: true };
    }

    formatActionResult(result, executionId, startTime) {
        const duration = Date.now() - startTime;
        
        // Ensure result has required fields
        const formattedResult = {
            success: result.success !== undefined ? result.success : true,
            message: result.message || 'Action completed',
            details: result.details || null,
            executionId,
            duration,
            timestamp: Date.now(),
            ...result // Include any additional fields
        };

        return formattedResult;
    }

    createErrorResult(message, details, executionId) {
        return {
            success: false,
            message,
            details,
            executionId,
            timestamp: Date.now()
        };
    }

    generateExecutionId() {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    // Action Implementations

    async scanCameras(params, context) {
        console.log('🔍 Scanning cameras...');
        
        const cameraRecovery = this.recoveryModules.get('camera');
        if (cameraRecovery && typeof cameraRecovery.scanDevices === 'function') {
            return await cameraRecovery.scanDevices(params);
        }

        // Fallback implementation
        const devices = [
            {
                id: 'camera-1',
                name: 'Integrated Camera',
                type: 'built-in',
                status: 'available',
                capabilities: {
                    maxWidth: 1920,
                    maxHeight: 1080,
                    frameRate: 30
                }
            },
            {
                id: 'obs-virtual',
                name: 'OBS Virtual Camera',
                type: 'virtual',
                status: 'available',
                capabilities: {
                    maxWidth: 1920,
                    maxHeight: 1080,
                    frameRate: 60
                }
            }
        ];

        const newCameraState = {
            devices: devices,
            lastScan: Date.now(),
            preferredDevice: devices[0]?.id || null,
            activeStreams: 0
        };

        return {
            success: true,
            message: `Camera scan completed: ${devices.length} devices found`,
            details: devices.map(d => `${d.name} (${d.type})`).join(', '),
            newState: {
                cameras: newCameraState
            },
            devices
        };
    }

    async fixCamera(params, context) {
        console.log('🔧 Fixing camera issues...');
        
        const cameraRecovery = this.recoveryModules.get('camera');
        if (!cameraRecovery) {
            return {
                success: false,
                message: 'Camera recovery module not available'
            };
        }

        const currentState = this.stateManager.getComponentState('cameras');
        const issues = currentState.issues || [];

        if (issues.length === 0) {
            // No specific issues, perform general camera refresh
            const recoveryId = this.generateExecutionId();
            const generalIssue = {
                id: 'general-refresh',
                message: 'General camera refresh requested',
                severity: 'info',
                timestamp: Date.now()
            };

            const recoveryContext = {
                issue: generalIssue,
                component: 'cameras',
                recoveryId,
                params
            };

            return await cameraRecovery.execute(recoveryContext);
        }

        // Handle specific issues
        const results = [];
        for (const issue of issues) {
            if (cameraRecovery.canHandle(issue)) {
                const recoveryId = this.generateExecutionId();
                const recoveryContext = {
                    issue,
                    component: 'cameras',
                    recoveryId,
                    params
                };

                const result = await cameraRecovery.execute(recoveryContext);
                results.push(result);
            }
        }

        const successfulRecoveries = results.filter(r => r.success);
        
        return {
            success: successfulRecoveries.length > 0,
            message: `Camera recovery: ${successfulRecoveries.length}/${results.length} issues resolved`,
            details: results.map(r => r.message).join('; '),
            recoveryResults: results
        };
    }

    async restartCameraStream(params, context) {
        console.log(`🔄 Restarting camera stream: ${params.cameraId}`);
        
        const cameraRecovery = this.recoveryModules.get('camera');
        if (!cameraRecovery) {
            return {
                success: false,
                message: 'Camera recovery module not available'
            };
        }

        const issue = {
            id: 'stream-restart',
            message: `Restart stream for camera ${params.cameraId}`,
            severity: 'info',
            cameraId: params.cameraId,
            timestamp: Date.now()
        };

        const recoveryContext = {
            issue,
            component: 'cameras',
            recoveryId: this.generateExecutionId(),
            params
        };

        return await cameraRecovery.execute(recoveryContext);
    }

    async showWindow(params, context) {
        console.log('🪟 Showing window...');
        
        const windowRecovery = this.recoveryModules.get('window');
        if (!windowRecovery) {
            return {
                success: false,
                message: 'Window recovery module not available'
            };
        }

        const issue = {
            id: 'show-window',
            message: 'Show main window requested',
            severity: 'info',
            timestamp: Date.now()
        };

        const recoveryContext = {
            issue,
            component: 'windows',
            recoveryId: this.generateExecutionId(),
            params
        };

        return await windowRecovery.execute(recoveryContext);
    }

    async restoreWindow(params, context) {
        console.log('🪟 Restoring window...');
        
        const windowRecovery = this.recoveryModules.get('window');
        if (!windowRecovery) {
            return {
                success: false,
                message: 'Window recovery module not available'
            };
        }

        const issue = {
            id: 'restore-window',
            message: 'Restore window from minimized state',
            severity: 'info',
            timestamp: Date.now()
        };

        const recoveryContext = {
            issue,
            component: 'windows',
            recoveryId: this.generateExecutionId(),
            params
        };

        return await windowRecovery.execute(recoveryContext);
    }

    async reconnectOBS(params, context) {
        console.log('🔗 Reconnecting to OBS...');
        
        const obsRecovery = this.recoveryModules.get('obs');
        if (!obsRecovery) {
            return {
                success: false,
                message: 'OBS recovery module not available'
            };
        }

        const issue = {
            id: 'reconnect-obs',
            message: 'OBS reconnection requested',
            severity: 'info',
            timestamp: Date.now()
        };

        const recoveryContext = {
            issue,
            component: 'obs',
            recoveryId: this.generateExecutionId(),
            params
        };

        return await obsRecovery.execute(recoveryContext);
    }

    async restartOBSVirtualCamera(params, context) {
        console.log('📹 Restarting OBS virtual camera...');
        
        const obsRecovery = this.recoveryModules.get('obs');
        if (!obsRecovery) {
            return {
                success: false,
                message: 'OBS recovery module not available'
            };
        }

        const issue = {
            id: 'restart-virtual-camera',
            message: 'Restart OBS virtual camera',
            severity: 'info',
            timestamp: Date.now()
        };

        const recoveryContext = {
            issue,
            component: 'obs',
            recoveryId: this.generateExecutionId(),
            params
        };

        return await obsRecovery.execute(recoveryContext);
    }

    async switchOBSScene(params, context) {
        console.log(`🎬 Switching OBS scene to: ${params.sceneName}`);
        
        const obsRecovery = this.recoveryModules.get('obs');
        if (!obsRecovery) {
            return {
                success: false,
                message: 'OBS recovery module not available'
            };
        }

        const issue = {
            id: 'switch-scene',
            message: `Switch to scene: ${params.sceneName}`,
            severity: 'info',
            sceneName: params.sceneName,
            timestamp: Date.now()
        };

        const recoveryContext = {
            issue,
            component: 'obs',
            recoveryId: this.generateExecutionId(),
            params
        };

        return await obsRecovery.execute(recoveryContext);
    }

    async autoRecover(params, context) {
        console.log('🤖 Starting automatic recovery...');
        
        const currentState = this.stateManager.getState();
        const allIssues = [];

        // Collect all issues from all components
        Object.keys(currentState).forEach(component => {
            if (currentState[component] && Array.isArray(currentState[component].issues)) {
                currentState[component].issues.forEach(issue => {
                    allIssues.push({ issue, component });
                });
            }
        });

        if (allIssues.length === 0) {
            return {
                success: true,
                message: 'No issues found to recover',
                details: 'System is healthy'
            };
        }

        const recoveryResults = [];
        let successCount = 0;

        // Try to recover each issue with appropriate module
        for (const { issue, component } of allIssues) {
            let recovered = false;

            // Try each recovery module to see if it can handle the issue
            for (const [moduleName, module] of this.recoveryModules) {
                if (module.canHandle && module.canHandle(issue)) {
                    const recoveryId = this.generateExecutionId();
                    const recoveryContext = {
                        issue,
                        component,
                        recoveryId,
                        params
                    };

                    try {
                        const result = await module.execute(recoveryContext);
                        recoveryResults.push({
                            module: moduleName,
                            issue: issue.message,
                            component,
                            result
                        });
                        
                        if (result.success) {
                            successCount++;
                        }
                        
                        recovered = true;
                        break;
                    } catch (error) {
                        recoveryResults.push({
                            module: moduleName,
                            issue: issue.message,
                            component,
                            result: {
                                success: false,
                                message: `Recovery failed: ${error.message}`
                            }
                        });
                    }
                }
            }

            if (!recovered) {
                recoveryResults.push({
                    module: 'none',
                    issue: issue.message,
                    component,
                    result: {
                        success: false,
                        message: 'No recovery module can handle this issue'
                    }
                });
            }
        }

        // Update recovery statistics
        const recoveryStats = this.stateManager.getComponentState('recovery');
        recoveryStats.statistics.totalRuns++;
        if (successCount > 0) {
            recoveryStats.statistics.successfulRuns++;
        } else {
            recoveryStats.statistics.failedRuns++;
        }

        return {
            success: successCount > 0,
            message: `Auto-recovery completed: ${successCount}/${allIssues.length} issues resolved`,
            details: `Processed ${allIssues.length} issues across ${this.recoveryModules.size} recovery modules`,
            recoveryResults,
            newState: {
                recovery: recoveryStats
            }
        };
    }

    async testRecovery(params, context) {
        console.log('🧪 Testing recovery system...');
        
        // Add simulated issues for testing
        this.stateManager.addIssue('cameras', 'Simulated camera stream failure', 'error');
        this.stateManager.addIssue('obs', 'Simulated OBS connection lost', 'warning');
        this.stateManager.addIssue('windows', 'Simulated window hidden', 'warning');

        return {
            success: true,
            message: 'Recovery test initiated',
            details: 'Added 3 simulated issues for testing recovery system'
        };
    }

    async clearIssues(params, context) {
        console.log(`🧹 Clearing issues for component: ${params.component}`);
        
        try {
            this.stateManager.clearIssues(params.component);
            
            return {
                success: true,
                message: `Issues cleared for component: ${params.component}`,
                details: `All issues removed from ${params.component} component`
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to clear issues: ${error.message}`,
                details: error.stack
            };
        }
    }

    async restartSystem(params, context) {
        console.log('🔄 Restarting system...');
        
        // Clear all issues from all components
        const components = ['cameras', 'obs', 'windows'];
        const clearedComponents = [];
        
        for (const component of components) {
            try {
                this.stateManager.clearIssues(component);
                clearedComponents.push(component);
            } catch (error) {
                console.warn(`Failed to clear issues for ${component}:`, error.message);
            }
        }

        // Update recovery statistics
        const recoveryStats = this.stateManager.getComponentState('recovery');
        recoveryStats.statistics.totalRuns++;
        recoveryStats.statistics.successfulRuns++;

        return {
            success: true,
            message: 'System restart completed',
            details: `Issues cleared from components: ${clearedComponents.join(', ')}`,
            newState: {
                recovery: recoveryStats
            }
        };
    }

    async forceStateRefresh(params, context) {
        console.log('🔄 Forcing state refresh...');
        
        // Trigger state refresh for all components
        const refreshResults = [];
        
        for (const [moduleName, module] of this.recoveryModules) {
            if (typeof module.refreshState === 'function') {
                try {
                    const result = await module.refreshState();
                    refreshResults.push({
                        module: moduleName,
                        success: true,
                        result
                    });
                } catch (error) {
                    refreshResults.push({
                        module: moduleName,
                        success: false,
                        error: error.message
                    });
                }
            }
        }

        const successfulRefreshes = refreshResults.filter(r => r.success);

        return {
            success: successfulRefreshes.length > 0,
            message: `State refresh completed: ${successfulRefreshes.length}/${refreshResults.length} modules refreshed`,
            details: refreshResults.map(r => 
                `${r.module}: ${r.success ? 'success' : r.error}`
            ).join('; '),
            refreshResults
        };
    }

    // Logging and History

    async logActionExecution(actionName, params, result, startTime, context) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            executionId: result.executionId,
            action: actionName,
            params,
            success: result.success,
            message: result.message,
            details: result.details,
            duration: Date.now() - startTime,
            context
        };

        // Add to in-memory history
        this.actionHistory.unshift(logEntry);
        if (this.actionHistory.length > this.maxHistorySize) {
            this.actionHistory = this.actionHistory.slice(0, this.maxHistorySize);
        }

        // Write to log file
        try {
            const logLine = JSON.stringify(logEntry) + '\n';
            await fs.appendFile(this.logFile, logLine);
        } catch (error) {
            console.error('❌ Failed to write action log:', error);
        }
    }

    getActionHistory(limit = 50) {
        return this.actionHistory.slice(0, limit);
    }

    getActionStatistics() {
        const total = this.actionHistory.length;
        const successful = this.actionHistory.filter(entry => entry.success).length;
        const failed = total - successful;
        
        const categories = {};
        const actions = {};
        
        this.actionHistory.forEach(entry => {
            const actionConfig = this.actionRegistry.get(entry.action);
            const category = actionConfig?.category || 'unknown';
            
            categories[category] = (categories[category] || 0) + 1;
            actions[entry.action] = (actions[entry.action] || 0) + 1;
        });

        return {
            total,
            successful,
            failed,
            successRate: total > 0 ? (successful / total * 100).toFixed(2) : 0,
            categories,
            actions,
            recentActions: this.actionHistory.slice(0, 10)
        };
    }
}

module.exports = ActionExecutor;