// OBS Scene Manager - Handles automatic scene switching based on active chat app

class OBSSceneManager {
    constructor() {
        this.isInitialized = false;
        this.isConnected = false;
        this.currentScene = null;
        this.autoSwitchEnabled = true;
        this.sceneMapping = {
            whatsapp: 'WhatsAppCam',
            messenger: 'MessengerCam',
            line: 'LINECam'
        }
        this.switchDelay = 500; // Delay before switching scenes
        this.switchTimer = null;
        
        this.initialize();
    }

    async initialize() {
        if (this.isInitialized) return;

        console.log('Initializing OBS Scene Manager...');

        try {
            // Check OBS connection status
            await this.checkOBSConnection();
            
            // Load scene configuration
            await this.loadSceneConfiguration();
            
            // Setup event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('OBS Scene Manager initialized successfully');
        } catch (error) {
            this.log('Failed to initialize OBS Scene Manager:', error);
            // Continue without OBS - graceful degradation
            this.isInitialized = true;
        }
    }

    async checkOBSConnection() {
        try {
            const result = await window.electronAPI.obs.isConnected();
            
            if (result.success) {
                this.isConnected = result.connected;
                console.log('OBS connection status:', this.isConnected);
                
                if (this.isConnected) {
                    // Get current scene
                    await this.getCurrentScene();
                }
            } else {
                this.log('Failed to check OBS connection:', result.error);
                this.isConnected = false;
            }
        } catch (error) {
            this.log('Error checking OBS connection:', error);
            this.isConnected = false;
        }
    }

    async loadSceneConfiguration() {
        try {
            // Load scene mapping from configuration
            const config = await window.electronAPI.config.get('obsScenes');
            
            if (config && config.scenes) {
                // Update scene mapping from config
                Object.keys(this.sceneMapping).forEach(app => {
                    const sceneConfig = config.scenes[this.sceneMapping[app]];
                    if (sceneConfig) {
                        this.sceneMapping[app] = sceneConfig.name;
                    }
                });
                
                this.autoSwitchEnabled = config.autoSwitching !== false;
                this.switchDelay = config.switchDelay || 500;
                
                console.log('Scene configuration loaded:', this.sceneMapping);
            }
        } catch (error) {
            this.log('Failed to load scene configuration, using defaults:', error);
        }
    }

    setupEventListeners() {
        // Listen for tab switches
        document.addEventListener('app-switched', (event) => {
            const { to } = event.detail;
            this.handleAppSwitch(to);
        });

        // Listen for tab switches (alternative event)
        document.addEventListener('tab-switched', (event) => {
            const { to } = event.detail;
            this.handleAppSwitch(to);
        });

        // Listen for OBS connection changes
        document.addEventListener('obs-connection-changed', (event) => {
            const { connected } = event.detail;
            this.isConnected = connected;
            console.log('OBS connection changed:', connected);
        });

        // Listen for scene switching preferences
        document.addEventListener('scene-switching-preference-changed', (event) => {
            const { enabled } = event.detail;
            this.autoSwitchEnabled = enabled;
            console.log('Auto scene switching:', enabled ? 'enabled' : 'disabled');
        });
    }

    handleAppSwitch(appName) {
        if (!this.autoSwitchEnabled) {
            console.log('Auto scene switching disabled, skipping');
            return;
        }

        if (!this.isConnected) {
            console.log('OBS not connected, skipping scene switch');
            return;
        }

        const targetScene = this.sceneMapping[appName];
        if (!targetScene) {
            this.log(`No scene mapping found for app: ${appName}`);
            return;
        }

        console.log(`App switched to ${appName}, scheduling scene switch to ${targetScene}`);
        
        // Clear any pending switch
        if (this.switchTimer) {
            clearTimeout(this.switchTimer);
        }

        // Schedule scene switch with delay
        this.switchTimer = setTimeout(async () => {
            await this.switchToScene(targetScene, appName);
        }, this.switchDelay);
    }

    async switchToScene(sceneName, appName = null) {
        if (!this.isConnected) {
            this.log('Cannot switch scene: OBS not connected');
            return false;
        }

        if (this.currentScene === sceneName) {
            console.log(`Already on scene ${sceneName}, skipping switch`);
            return true;
        }

        try {
            console.log(`Switching OBS scene to: ${sceneName}`);
            
            const result = await window.electronAPI.obs.switchScene(sceneName);
            
            if (result.success) {
                this.currentScene = sceneName;
                console.log(`Successfully switched to scene: ${sceneName}`);
                
                // Emit scene switch event
                this.emitSceneEvent('scene-switched', {
                    scene: sceneName,
                    app: appName,
                    timestamp: new Date().toISOString()
                });
                
                // Update UI
                this.updateSceneUI(sceneName);
                
                return true;
            } else {
                this.log('Failed to switch OBS scene:', result.error);
                
                // Emit scene switch failed event
                this.emitSceneEvent('scene-switch-failed', {
                    scene: sceneName,
                    app: appName,
                    error: result.error
                });
                
                return false;
            }
        } catch (error) {
            this.log('Error switching OBS scene:', error);
            return false;
        }
    }

    async getCurrentScene() {
        if (!this.isConnected) {
            return null;
        }

        try {
            const result = await window.electronAPI.obs.getCurrentScene();
            
            if (result.success) {
                this.currentScene = result.scene;
                console.log('Current OBS scene:', this.currentScene);
                return this.currentScene;
            } else {
                this.log('Failed to get current OBS scene:', result.error);
                return null;
            }
        } catch (error) {
            this.log('Error getting current OBS scene:', error);
            return null;
        }
    }

    async connectToOBS() {
        try {
            console.log('Attempting to connect to OBS...');
            
            const result = await window.electronAPI.obs.connect();
            
            if (result.success) {
                this.isConnected = true;
                console.log('Connected to OBS successfully');
                
                // Get current scene
                await this.getCurrentScene();
                
                // Emit connection event
                this.emitSceneEvent('obs-connected', {
                    timestamp: new Date().toISOString()
                });
                
                return true;
            } else {
                this.log('Failed to connect to OBS:', result.error);
                this.isConnected = false;
                return false;
            }
        } catch (error) {
            this.log('Error connecting to OBS:', error);
            this.isConnected = false;
            return false;
        }
    }

    async disconnectFromOBS() {
        try {
            const result = await window.electronAPI.obs.disconnect();
            
            if (result.success) {
                this.isConnected = false;
                this.currentScene = null;
                console.log('Disconnected from OBS');
                
                // Emit disconnection event
                this.emitSceneEvent('obs-disconnected', {
                    timestamp: new Date().toISOString()
                });
                
                return true;
            } else {
                this.log('Failed to disconnect from OBS:', result.error);
                return false;
            }
        } catch (error) {
            this.log('Error disconnecting from OBS:', error);
            return false;
        }
    }

    // Manual scene switching
    async manualSceneSwitch(sceneName) {
        console.log(`Manual scene switch requested: ${sceneName}`);
        
        // Temporarily disable auto switching to prevent conflicts
        const wasAutoEnabled = this.autoSwitchEnabled;
        this.autoSwitchEnabled = false;
        
        const success = await this.switchToScene(sceneName, 'manual');
        
        // Re-enable auto switching after a delay
        setTimeout(() => {
            this.autoSwitchEnabled = wasAutoEnabled;
        }, 2000);
        
        return success;
    }

    // Scene mapping management
    setSceneMapping(appName, sceneName) {
        if (this.sceneMapping.hasOwnProperty(appName)) {
            this.sceneMapping[appName] = sceneName;
            console.log(`Updated scene mapping: ${appName} -> ${sceneName}`);
            
            // Save to configuration
            this.saveSceneConfiguration();
            
            return true;
        } else {
            this.handleError('Invalid app name for scene mapping: ${appName}', new Error('Invalid app name for scene mapping: ${appName}'));
            return false;
        }
    }

    getSceneMapping() {
        return { ...this.sceneMapping }
    }

    async saveSceneConfiguration() {
        try {
            const config = {
                scenes: {},
                autoSwitching: this.autoSwitchEnabled,
                switchDelay: this.switchDelay
            }
            // Convert scene mapping to config format
            Object.entries(this.sceneMapping).forEach(([app, scene]) => {
                config.scenes[scene] = {
                    name: scene,
                    description: `Optimized scene for ${app} video calls`
                }
            });
            
            await window.electronAPI.config.set('obsScenes', config);
            console.log('Scene configuration saved');
        } catch (error) {
            this.log('Failed to save scene configuration:', error);
        }
    }

    // Configuration methods
    setAutoSwitchEnabled(enabled) {
        this.autoSwitchEnabled = enabled;
        console.log('Auto scene switching:', enabled ? 'enabled' : 'disabled');
        
        // Emit preference change event
        this.emitSceneEvent('scene-switching-preference-changed', { enabled });
        
        // Save configuration
        this.saveSceneConfiguration();
    }

    setSwitchDelay(delayMs) {
        this.switchDelay = delayMs;
        console.log(`Scene switch delay updated to ${delayMs}ms`);
        
        // Save configuration
        this.saveSceneConfiguration();
    }

    updateSceneUI(sceneName) {
        // Update scene selector if it exists
        const sceneSelect = (document.getElementById('scene-select') || {});
        if (sceneSelect) {
            // Find and select the current scene
            for (let option of sceneSelect.options) {
                if (option.value === sceneName || option.textContent.includes(sceneName)) {
                    sceneSelect.value = option.value;
                    break;
                }
            }
        }

        // Update OBS status indicator
        const obsStatus = (document.getElementById('obs-status') || {});
        if (obsStatus) {
            obsStatus.textContent = this.isConnected ? 'Connected' : 'Disconnected';
            obsStatus.style.color = this.isConnected ? '#27ae60' : '#e74c3c';
        }
    }

    emitSceneEvent(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
    }

    // Public API
    isOBSConnected() {
        return this.isConnected;
    }

    getCurrentSceneName() {
        return this.currentScene;
    }

    isAutoSwitchEnabled() {
        return this.autoSwitchEnabled;
    }

    getSwitchDelay() {
        return this.switchDelay;
    }

    getStatus() {
        return {
            initialized: this.isInitialized,
            connected: this.isConnected,
            currentScene: this.currentScene,
            autoSwitchEnabled: this.autoSwitchEnabled,
            sceneMapping: this.sceneMapping,
            switchDelay: this.switchDelay
        }
    }

    async destroy() {
        console.log('Destroying OBS Scene Manager...');
        
        // Clear any pending switches
        if (this.switchTimer) {
            clearTimeout(this.switchTimer);
            this.switchTimer = null;
        }
        
        this.isInitialized = false;
        this.isConnected = false;
        this.currentScene = null;
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] obs-scene-manager ${level}: ${message}`;
        
        if (level === 'ERROR') {
            console.warn(logMessage);
        } else {
            console.log(logMessage);
        }
    }
}

// Export for use in main scripts
window.OBSSceneManager = OBSSceneManager;