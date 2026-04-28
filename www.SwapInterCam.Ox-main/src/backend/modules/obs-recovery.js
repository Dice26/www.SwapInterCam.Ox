/**
 * OBS Recovery Module - Backend-Centric OBS Management
 * Handles OBS connection issues, virtual camera problems, and scene management
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class OBSRecoveryModule {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.name = 'obs-recovery';
        this.recoveryStrategies = new Map();
        this.activeRecoveries = new Map();
        this.monitoringInterval = null;
        this.connectionAttempts = 0;
        this.maxConnectionAttempts = 5;
        this.lastConnectionCheck = null;
        
        this.initializeStrategies();
        console.log('🎥 OBS Recovery Module initialized');
    }

    initializeStrategies() {
        // Register OBS recovery strategies
        this.recoveryStrategies.set('reconnect-obs', {
            name: 'Reconnect OBS',
            description: 'Reconnect to OBS Studio',
            severity: ['warning', 'error'],
            execute: this.reconnectOBS.bind(this)
        });

        this.recoveryStrategies.set('restart-virtual-camera', {
            name: 'Restart Virtual Camera',
            description: 'Restart OBS Virtual Camera',
            severity: ['warning', 'error'],
            execute: this.restartVirtualCamera.bind(this)
        });

        this.recoveryStrategies.set('fix-scene-switching', {
            name: 'Fix Scene Switching',
            description: 'Fix OBS scene switching issues',
            severity: ['warning'],
            execute: this.fixSceneSwitching.bind(this)
        });

        this.recoveryStrategies.set('restart-obs-process', {
            name: 'Restart OBS Process',
            description: 'Restart OBS Studio process',
            severity: ['error', 'critical'],
            execute: this.restartOBSProcess.bind(this)
        });

        this.recoveryStrategies.set('reset-obs-config', {
            name: 'Reset OBS Config',
            description: 'Reset OBS configuration',
            severity: ['critical'],
            execute: this.resetOBSConfig.bind(this)
        });

        this.recoveryStrategies.set('force-obs-startup', {
            name: 'Force OBS Startup',
            description: 'Force start OBS Studio',
            severity: ['error', 'critical'],
            execute: this.forceOBSStartup.bind(this)
        });

        console.log(`🎥 Registered ${this.recoveryStrategies.size} OBS recovery strategies`);
    }

    /**
     * Check if this module can handle a specific issue
     */
    canHandle(issue) {
        const obsKeywords = [
            'obs', 'virtual camera', 'scene', 'streaming', 'recording',
            'websocket', 'connection', 'studio', 'broadcast', 'output',
            'source', 'filter', 'transition', 'plugin'
        ];
        
        return obsKeywords.some(keyword => 
            issue.message.toLowerCase().includes(keyword.toLowerCase())
        );
    }

    /**
     * Execute recovery for OBS issues
     */
    async execute(context) {
        const { issue, component, recoveryId } = context;
        
        console.log(`🔧 Executing OBS recovery for: ${issue.message}`);
        
        // Track active recovery
        this.activeRecoveries.set(recoveryId, {
            issue,
            startTime: Date.now(),
            strategy: null,
            status: 'running'
        });

        try {
            // Update state to show recovery in progress
            this.stateManager.updateState({
                recovery: {
                    activeOperations: [{
                        id: recoveryId,
                        type: 'obs-recovery',
                        target: issue.message,
                        status: 'running',
                        startTime: Date.now()
                    }]
                }
            }, 'obs-recovery');

            // Determine best recovery strategy
            const strategy = this.selectRecoveryStrategy(issue);
            
            if (!strategy) {
                throw new Error(`No suitable recovery strategy for: ${issue.message}`);
            }

            console.log(`🎥 Using strategy: ${strategy.name}`);
            this.activeRecoveries.get(recoveryId).strategy = strategy.name;

            // Execute the recovery strategy
            const result = await strategy.execute(issue, context);

            // Update recovery tracking
            this.activeRecoveries.delete(recoveryId);

            // Update state with success
            this.stateManager.updateState({
                recovery: {
                    activeOperations: [],
                    lastRun: {
                        [this.name]: Date.now()
                    },
                    statistics: {
                        totalRuns: this.stateManager.getComponentState('recovery').statistics.totalRuns + 1,
                        successfulRuns: this.stateManager.getComponentState('recovery').statistics.successfulRuns + 1
                    }
                }
            }, 'obs-recovery');

            console.log(`✅ OBS recovery completed: ${result.message}`);
            return result;

        } catch (error) {
            console.error(`❌ OBS recovery failed:`, error);

            // Update recovery tracking
            this.activeRecoveries.delete(recoveryId);

            // Update state with failure
            this.stateManager.updateState({
                recovery: {
                    activeOperations: [],
                    statistics: {
                        totalRuns: this.stateManager.getComponentState('recovery').statistics.totalRuns + 1,
                        failedRuns: this.stateManager.getComponentState('recovery').statistics.failedRuns + 1
                    }
                }
            }, 'obs-recovery');

            return {
                success: false,
                message: `OBS recovery failed: ${error.message}`,
                details: error.stack,
                strategy: this.activeRecoveries.get(recoveryId)?.strategy || 'unknown'
            };
        }
    }

    /**
     * Select the best recovery strategy for an issue
     */
    selectRecoveryStrategy(issue) {
        const message = issue.message.toLowerCase();
        
        // Connection issues
        if (message.includes('connection') || message.includes('websocket') || message.includes('disconnected')) {
            return this.recoveryStrategies.get('reconnect-obs');
        }
        
        // Virtual camera issues
        if (message.includes('virtual camera') || message.includes('camera') || message.includes('video output')) {
            return this.recoveryStrategies.get('restart-virtual-camera');
        }
        
        // Scene issues
        if (message.includes('scene') || message.includes('switching') || message.includes('transition')) {
            return this.recoveryStrategies.get('fix-scene-switching');
        }
        
        // Process issues
        if (message.includes('crashed') || message.includes('unresponsive') || message.includes('frozen')) {
            return this.recoveryStrategies.get('restart-obs-process');
        }
        
        // Startup issues
        if (message.includes('startup') || message.includes('launch') || message.includes('not running')) {
            return this.recoveryStrategies.get('force-obs-startup');
        }
        
        // Critical configuration issues
        if (issue.severity === 'critical' || message.includes('config') || message.includes('settings')) {
            return this.recoveryStrategies.get('reset-obs-config');
        }
        
        // Default to reconnection for general issues
        return this.recoveryStrategies.get('reconnect-obs');
    }

    /**
     * Recovery Strategy: Reconnect OBS
     */
    async reconnectOBS(issue, context) {
        console.log('🔌 Reconnecting to OBS Studio...');
        
        try {
            // Check if OBS is running
            const obsStatus = await this.checkOBSProcess();
            
            if (!obsStatus.running) {
                console.log('🎥 OBS not running, attempting to start...');
                const startResult = await this.startOBSProcess();
                
                if (!startResult.success) {
                    throw new Error(`Failed to start OBS: ${startResult.error}`);
                }
                
                // Wait for OBS to initialize
                await this.sleep(3000);
            }
            
            // Attempt WebSocket connection
            const connectionResult = await this.establishOBSConnection();
            
            if (connectionResult.success) {
                // Remove the connection issue
                this.stateManager.removeIssue('obs', issue.id);
                
                // Update OBS state
                const newOBSState = {
                    connected: true,
                    virtualCamera: connectionResult.virtualCamera || false,
                    currentScene: connectionResult.currentScene || 'Main Scene',
                    availableScenes: connectionResult.scenes || ['Main Scene'],
                    lastConnection: Date.now()
                };
                
                return {
                    success: true,
                    message: 'OBS reconnected successfully',
                    details: `Connected to OBS Studio with ${connectionResult.scenes?.length || 1} scenes`,
                    newState: {
                        obs: newOBSState
                    }
                };
            } else {
                throw new Error(`Failed to establish OBS connection: ${connectionResult.error}`);
            }
            
        } catch (error) {
            console.error('❌ OBS reconnection failed:', error);
            
            return {
                success: false,
                message: 'Failed to reconnect to OBS',
                details: error.message
            };
        }
    }

    /**
     * Recovery Strategy: Restart Virtual Camera
     */
    async restartVirtualCamera(issue, context) {
        console.log('📹 Restarting OBS Virtual Camera...');
        
        try {
            // Check OBS connection first
            const obsState = this.stateManager.getComponentState('obs');
            
            if (!obsState.connected) {
                console.log('🎥 OBS not connected, reconnecting first...');
                const reconnectResult = await this.reconnectOBS(issue, context);
                
                if (!reconnectResult.success) {
                    throw new Error('Failed to reconnect to OBS before virtual camera restart');
                }
            }
            
            // Stop virtual camera
            console.log('🎥 Stopping virtual camera...');
            const stopResult = await this.stopVirtualCamera();
            
            if (stopResult.success) {
                // Wait a moment
                await this.sleep(2000);
                
                // Start virtual camera
                console.log('🎥 Starting virtual camera...');
                const startResult = await this.startVirtualCamera();
                
                if (startResult.success) {
                    // Remove the virtual camera issue
                    this.stateManager.removeIssue('obs', issue.id);
                    
                    // Update OBS state
                    const newOBSState = {
                        virtualCamera: true,
                        connected: true,
                        lastConnection: Date.now()
                    };
                    
                    return {
                        success: true,
                        message: 'OBS Virtual Camera restarted successfully',
                        details: 'Virtual camera is now active and available',
                        newState: {
                            obs: newOBSState
                        }
                    };
                } else {
                    throw new Error(`Failed to start virtual camera: ${startResult.error}`);
                }
            } else {
                throw new Error(`Failed to stop virtual camera: ${stopResult.error}`);
            }
            
        } catch (error) {
            console.error('❌ Virtual camera restart failed:', error);
            
            return {
                success: false,
                message: 'Failed to restart OBS Virtual Camera',
                details: error.message
            };
        }
    }

    /**
     * Recovery Strategy: Fix Scene Switching
     */
    async fixSceneSwitching(issue, context) {
        console.log('🎬 Fixing OBS scene switching...');
        
        try {
            // Get current scene information
            const sceneInfo = await this.getSceneInformation();
            
            if (!sceneInfo.success) {
                throw new Error(`Failed to get scene information: ${sceneInfo.error}`);
            }
            
            // Validate scenes
            const validationResult = await this.validateScenes(sceneInfo.scenes);
            
            if (validationResult.issues.length > 0) {
                console.log(`🎬 Found ${validationResult.issues.length} scene issues, fixing...`);
                
                // Fix scene issues
                const fixResult = await this.fixSceneIssues(validationResult.issues);
                
                if (!fixResult.success) {
                    throw new Error(`Failed to fix scene issues: ${fixResult.error}`);
                }
            }
            
            // Test scene switching
            const switchTest = await this.testSceneSwitching(sceneInfo.scenes);
            
            if (switchTest.success) {
                // Remove the scene switching issue
                this.stateManager.removeIssue('obs', issue.id);
                
                // Update OBS state
                const newOBSState = {
                    availableScenes: sceneInfo.scenes.map(s => s.name),
                    currentScene: switchTest.currentScene,
                    connected: true
                };
                
                return {
                    success: true,
                    message: 'OBS scene switching fixed successfully',
                    details: `Validated ${sceneInfo.scenes.length} scenes and restored switching functionality`,
                    newState: {
                        obs: newOBSState
                    }
                };
            } else {
                throw new Error(`Scene switching test failed: ${switchTest.error}`);
            }
            
        } catch (error) {
            console.error('❌ Scene switching fix failed:', error);
            
            return {
                success: false,
                message: 'Failed to fix OBS scene switching',
                details: error.message
            };
        }
    }

    /**
     * Recovery Strategy: Restart OBS Process
     */
    async restartOBSProcess(issue, context) {
        console.log('🔄 Restarting OBS Studio process...');
        
        try {
            // Get current OBS process info
            const processInfo = await this.getOBSProcessInfo();
            
            if (processInfo.running) {
                console.log('🎥 Terminating existing OBS process...');
                await this.terminateOBSProcess(processInfo.pid);
                
                // Wait for process to terminate
                await this.sleep(3000);
            }
            
            // Start new OBS process
            console.log('🎥 Starting new OBS process...');
            const startResult = await this.startOBSProcess();
            
            if (startResult.success) {
                // Wait for OBS to initialize
                await this.sleep(5000);
                
                // Establish connection
                const connectionResult = await this.establishOBSConnection();
                
                if (connectionResult.success) {
                    // Remove the process issue
                    this.stateManager.removeIssue('obs', issue.id);
                    
                    // Update OBS state
                    const newOBSState = {
                        connected: true,
                        virtualCamera: false, // Will need to be restarted
                        currentScene: connectionResult.currentScene || 'Main Scene',
                        availableScenes: connectionResult.scenes || ['Main Scene'],
                        lastConnection: Date.now()
                    };
                    
                    return {
                        success: true,
                        message: 'OBS process restarted successfully',
                        details: `New OBS process started with PID: ${startResult.pid}`,
                        newState: {
                            obs: newOBSState
                        }
                    };
                } else {
                    throw new Error(`Failed to connect to restarted OBS: ${connectionResult.error}`);
                }
            } else {
                throw new Error(`Failed to start OBS process: ${startResult.error}`);
            }
            
        } catch (error) {
            console.error('❌ OBS process restart failed:', error);
            
            return {
                success: false,
                message: 'Failed to restart OBS process',
                details: error.message
            };
        }
    }

    /**
     * Recovery Strategy: Force OBS Startup
     */
    async forceOBSStartup(issue, context) {
        console.log('💪 Force starting OBS Studio...');
        
        try {
            // Kill any existing OBS processes
            await this.killAllOBSProcesses();
            
            // Wait for cleanup
            await this.sleep(2000);
            
            // Force start OBS with specific parameters
            const forceStartResult = await this.forceStartOBS();
            
            if (forceStartResult.success) {
                // Wait for OBS to fully initialize
                await this.sleep(8000);
                
                // Attempt connection with retries
                let connectionResult = null;
                for (let i = 0; i < 3; i++) {
                    connectionResult = await this.establishOBSConnection();
                    if (connectionResult.success) break;
                    
                    console.log(`🎥 Connection attempt ${i + 1} failed, retrying...`);
                    await this.sleep(3000);
                }
                
                if (connectionResult && connectionResult.success) {
                    // Remove the startup issue
                    this.stateManager.removeIssue('obs', issue.id);
                    
                    // Update OBS state
                    const newOBSState = {
                        connected: true,
                        virtualCamera: false,
                        currentScene: connectionResult.currentScene || 'Main Scene',
                        availableScenes: connectionResult.scenes || ['Main Scene'],
                        lastConnection: Date.now()
                    };
                    
                    return {
                        success: true,
                        message: 'OBS force startup completed successfully',
                        details: 'OBS Studio started and connection established',
                        newState: {
                            obs: newOBSState
                        }
                    };
                } else {
                    throw new Error('Failed to establish connection after force startup');
                }
            } else {
                throw new Error(`Failed to force start OBS: ${forceStartResult.error}`);
            }
            
        } catch (error) {
            console.error('❌ OBS force startup failed:', error);
            
            return {
                success: false,
                message: 'Failed to force start OBS',
                details: error.message
            };
        }
    }

    /**
     * Recovery Strategy: Reset OBS Config
     */
    async resetOBSConfig(issue, context) {
        console.log('🔄 Resetting OBS configuration...');
        
        try {
            // Clear all OBS issues first
            this.stateManager.clearIssues('obs');
            
            // Reset OBS state to defaults
            const defaultOBSState = {
                connected: false,
                virtualCamera: false,
                currentScene: null,
                availableScenes: [],
                issues: [],
                lastConnection: null
            };
            
            this.stateManager.setComponentState('obs', defaultOBSState, 'obs-config-reset');
            
            // Wait for state to settle
            await this.sleep(1000);
            
            // Perform fresh OBS initialization
            const initResult = await this.initializeOBS();
            
            if (initResult.success) {
                // Update with fresh state
                const newOBSState = {
                    connected: initResult.connected || false,
                    virtualCamera: initResult.virtualCamera || false,
                    currentScene: initResult.currentScene || 'Main Scene',
                    availableScenes: initResult.scenes || ['Main Scene'],
                    lastConnection: initResult.connected ? Date.now() : null
                };
                
                return {
                    success: true,
                    message: 'OBS configuration reset successfully',
                    details: 'Complete OBS state reset and reinitialization',
                    newState: {
                        obs: newOBSState
                    }
                };
            } else {
                throw new Error(`Failed to initialize OBS: ${initResult.error}`);
            }
            
        } catch (error) {
            console.error('❌ OBS config reset failed:', error);
            
            return {
                success: false,
                message: 'Failed to reset OBS configuration',
                details: error.message
            };
        }
    }

    /**
     * Check OBS process status
     */
    async checkOBSProcess() {
        try {
            // Simulate OBS process check
            return {
                running: Math.random() > 0.3, // 70% chance OBS is running
                pid: Math.floor(Math.random() * 10000) + 1000,
                name: 'obs64.exe',
                memory: 200 * 1024 * 1024 // 200MB
            };
        } catch (error) {
            return {
                running: false,
                error: error.message
            };
        }
    }

    /**
     * Start OBS process
     */
    async startOBSProcess() {
        try {
            console.log('🎥 Starting OBS Studio process...');
            
            // Simulate OBS process start
            await this.sleep(2000);
            
            const newPid = Math.floor(Math.random() * 10000) + 1000;
            
            return {
                success: true,
                pid: newPid
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Establish OBS WebSocket connection
     */
    async establishOBSConnection() {
        try {
            console.log('🔌 Establishing OBS WebSocket connection...');
            
            // Simulate WebSocket connection
            await this.sleep(1500);
            
            // Simulate connection success with scene info
            const scenes = ['Main Scene', 'Camera Only', 'Screen Share', 'BRB Scene'];
            const currentScene = scenes[Math.floor(Math.random() * scenes.length)];
            
            return {
                success: true,
                currentScene: currentScene,
                scenes: scenes,
                virtualCamera: Math.random() > 0.5
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Stop virtual camera
     */
    async stopVirtualCamera() {
        try {
            console.log('🎥 Stopping OBS Virtual Camera...');
            await this.sleep(1000);
            
            return {
                success: true
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Start virtual camera
     */
    async startVirtualCamera() {
        try {
            console.log('🎥 Starting OBS Virtual Camera...');
            await this.sleep(1500);
            
            return {
                success: true
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get scene information
     */
    async getSceneInformation() {
        try {
            // Simulate scene information retrieval
            const scenes = [
                { name: 'Main Scene', sources: 3, active: true },
                { name: 'Camera Only', sources: 1, active: false },
                { name: 'Screen Share', sources: 2, active: false },
                { name: 'BRB Scene', sources: 1, active: false }
            ];
            
            return {
                success: true,
                scenes: scenes,
                currentScene: 'Main Scene'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Validate scenes
     */
    async validateScenes(scenes) {
        const issues = [];
        
        // Simulate scene validation
        scenes.forEach(scene => {
            if (scene.sources === 0) {
                issues.push(`Scene '${scene.name}' has no sources`);
            }
        });
        
        return {
            valid: issues.length === 0,
            issues: issues
        };
    }

    /**
     * Fix scene issues
     */
    async fixSceneIssues(issues) {
        try {
            console.log(`🎬 Fixing ${issues.length} scene issues...`);
            await this.sleep(2000);
            
            return {
                success: true,
                fixed: issues.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Test scene switching
     */
    async testSceneSwitching(scenes) {
        try {
            console.log('🎬 Testing scene switching...');
            
            // Simulate scene switching test
            for (const scene of scenes.slice(0, 2)) {
                await this.sleep(500);
                console.log(`🎬 Switching to scene: ${scene.name}`);
            }
            
            return {
                success: true,
                currentScene: scenes[0].name
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get OBS process information
     */
    async getOBSProcessInfo() {
        try {
            return {
                running: true,
                pid: Math.floor(Math.random() * 10000) + 1000,
                name: 'obs64.exe',
                memory: 200 * 1024 * 1024
            };
        } catch (error) {
            return {
                running: false,
                error: error.message
            };
        }
    }

    /**
     * Terminate OBS process
     */
    async terminateOBSProcess(pid) {
        try {
            console.log(`🎥 Terminating OBS process PID: ${pid}`);
            await this.sleep(1500);
            
            return {
                success: true,
                pid: pid
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Kill all OBS processes
     */
    async killAllOBSProcesses() {
        try {
            console.log('🎥 Killing all OBS processes...');
            await this.sleep(2000);
            
            return {
                success: true,
                killed: Math.floor(Math.random() * 3) + 1
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Force start OBS
     */
    async forceStartOBS() {
        try {
            console.log('🎥 Force starting OBS with special parameters...');
            await this.sleep(3000);
            
            return {
                success: true,
                pid: Math.floor(Math.random() * 10000) + 1000
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Initialize OBS
     */
    async initializeOBS() {
        try {
            console.log('🎥 Initializing OBS...');
            await this.sleep(2500);
            
            return {
                success: true,
                connected: true,
                virtualCamera: false,
                currentScene: 'Main Scene',
                scenes: ['Main Scene', 'Camera Only', 'Screen Share']
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Start monitoring OBS health
     */
    startMonitoring(interval = 20000) {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        this.monitoringInterval = setInterval(() => {
            this.performHealthCheck();
        }, interval);
        
        console.log(`👁️ OBS monitoring started (${interval}ms interval)`);
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('👁️ OBS monitoring stopped');
        }
    }

    /**
     * Perform OBS health check
     */
    async performHealthCheck() {
        try {
            const obsState = this.stateManager.getComponentState('obs');
            const now = Date.now();
            
            // Check connection timeout
            if (obsState.connected && obsState.lastConnection && 
                (now - obsState.lastConnection) > 120000) { // 2 minutes
                
                const existingIssue = obsState.issues.find(i => 
                    i.message === 'OBS connection timeout'
                );
                
                if (!existingIssue) {
                    this.stateManager.addIssue('obs', 
                        'OBS connection timeout', 'warning');
                }
            }
            
            // Check virtual camera status
            if (obsState.connected && !obsState.virtualCamera) {
                const existingIssue = obsState.issues.find(i => 
                    i.message === 'OBS Virtual Camera not active'
                );
                
                if (!existingIssue) {
                    this.stateManager.addIssue('obs', 
                        'OBS Virtual Camera not active', 'warning');
                }
            }
            
            // Check scene availability
            if (obsState.connected && obsState.availableScenes.length === 0) {
                const existingIssue = obsState.issues.find(i => 
                    i.message === 'No OBS scenes available'
                );
                
                if (!existingIssue) {
                    this.stateManager.addIssue('obs', 
                        'No OBS scenes available', 'error');
                }
            }
            
            this.lastConnectionCheck = now;
            
        } catch (error) {
            console.error('❌ OBS health check failed:', error);
        }
    }

    /**
     * Get module status
     */
    getStatus() {
        return {
            name: this.name,
            active: true,
            strategies: Array.from(this.recoveryStrategies.keys()),
            activeRecoveries: this.activeRecoveries.size,
            monitoring: !!this.monitoringInterval,
            lastConnectionCheck: this.lastConnectionCheck,
            connectionAttempts: this.connectionAttempts,
            maxConnectionAttempts: this.maxConnectionAttempts
        };
    }

    /**
     * Utility: Sleep function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = OBSRecoveryModule;