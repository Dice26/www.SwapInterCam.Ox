/**
 * Automatic Scene Switcher for SwapInterCam Chat Desktop UI
 * Handles automatic OBS scene switching based on active chat application
 */

class AutomaticSceneSwitcher {
    constructor(obsController, tabManager) {
        this.obsController = obsController;
        this.tabManager = tabManager;
        this.isEnabled = true;
        this.switchDelay = 500; // 500ms delay to avoid rapid switching
        this.switchTimeout = null;
        this.lastActiveTab = null;
        this.sceneHistory = [];
        this.maxHistoryLength = 10;
        
        this.initialize();
    }

    initialize() {
        console.log('Initializing Automatic Scene Switcher...');
        
        // Listen for tab changes
        document.addEventListener('tab-changed', (event) => {
            this.handleTabChange(event.detail);
        });
        
        // Listen for OBS connection status
        document.addEventListener('obs-connected', () => {
            this.onOBSConnected();
        });
        
        document.addEventListener('obs-disconnected', () => {
            this.onOBSDisconnected();
        });
        
        // Listen for scene switch results
        document.addEventListener('obs-scene-switched', (event) => {
            this.onSceneSwitched(event.detail);
        });
        
        document.addEventListener('obs-scene-switch-failed', (event) => {
            this.onSceneSwitchFailed(event.detail);
        });
        
        console.log('Automatic Scene Switcher initialized');
    }

    handleTabChange(tabInfo) {
        if (!this.isEnabled) {
            console.log('Automatic scene switching is disabled');
            return;
        }

        const { activeTab, previousTab } = tabInfo;
        
        console.log(`Tab changed from ${previousTab} to ${activeTab}`);
        
        // Clear any pending switch
        if (this.switchTimeout) {
            clearTimeout(this.switchTimeout);
        }
        
        // Delay the switch to avoid rapid switching during tab navigation
        this.switchTimeout = setTimeout(() => {
            this.performSceneSwitch(activeTab, previousTab);
        }, this.switchDelay);
    }

    async performSceneSwitch(activeTab, previousTab) {
        if (!this.obsController.isConnected) {
            console.warn('OBS not connected, cannot switch scene');
            this.emitEvent('scene-switch-skipped', {
                reason: 'obs_not_connected',
                activeTab,
                previousTab
            });
            return;
        }

        try {
            console.log(`Performing automatic scene switch to ${activeTab}`);
            
            // Record the switch attempt
            this.recordSceneSwitch(activeTab, previousTab);
            
            // Perform the actual scene switch
            const success = await this.obsController.switchScene(activeTab);
            
            if (success) {
                this.lastActiveTab = activeTab;
                this.emitEvent('automatic-scene-switched', {
                    activeTab,
                    previousTab,
                    success: true
                });
                
                console.log(`Successfully switched to scene for ${activeTab}`);
            } else {
                this.emitEvent('automatic-scene-switch-failed', {
                    activeTab,
                    previousTab,
                    reason: 'obs_switch_failed'
                });
                
                console.error(`Failed to switch to scene for ${activeTab}`);
            }
            
        } catch (error) {
            console.error('Error during automatic scene switch:', error);
            
            this.emitEvent('automatic-scene-switch-error', {
                activeTab,
                previousTab,
                error: error.message
            });
        }
    }

    recordSceneSwitch(activeTab, previousTab) {
        const record = {
            timestamp: Date.now(),
            activeTab,
            previousTab,
            sceneName: this.obsController.sceneMapping[activeTab] || 'Unknown'
        };
        
        this.sceneHistory.push(record);
        
        // Limit history length
        if (this.sceneHistory.length > this.maxHistoryLength) {
            this.sceneHistory.shift();
        }
    }

    onOBSConnected() {
        console.log('OBS connected - automatic scene switching enabled');
        
        // If we have an active tab, switch to its scene
        if (this.tabManager && this.tabManager.activeTab) {
            setTimeout(() => {
                this.performSceneSwitch(this.tabManager.activeTab, null);
            }, 1000); // Give OBS time to fully initialize
        }
        
        this.emitEvent('scene-switcher-enabled', {
            reason: 'obs_connected'
        });
    }

    onOBSDisconnected() {
        console.log('OBS disconnected - automatic scene switching disabled');
        
        // Clear any pending switches
        if (this.switchTimeout) {
            clearTimeout(this.switchTimeout);
            this.switchTimeout = null;
        }
        
        this.emitEvent('scene-switcher-disabled', {
            reason: 'obs_disconnected'
        });
    }

    onSceneSwitched(details) {
        console.log(`Scene switched successfully: ${details.scene} for app: ${details.app}`);
        
        // Update last active tab
        this.lastActiveTab = details.app;
        
        // Emit success event
        this.emitEvent('scene-switch-confirmed', details);
    }

    onSceneSwitchFailed(details) {
        console.error(`Scene switch failed: ${details.scene} for app: ${details.app}`, details.error);
        
        // Emit failure event
        this.emitEvent('scene-switch-failure', details);
        
        // Optionally retry after a delay
        if (this.shouldRetrySwitch(details)) {
            setTimeout(() => {
                console.log(`Retrying scene switch for ${details.app}`);
                this.performSceneSwitch(details.app, this.lastActiveTab);
            }, 2000);
        }
    }

    shouldRetrySwitch(details) {
        // Only retry if it's a temporary failure and not a configuration issue
        const retryableErrors = [
            'connection_lost',
            'timeout',
            'temporary_failure'
        ];
        
        return retryableErrors.some(error => 
            details.error && details.error.includes(error)
        );
    }

    // Configuration methods
    enable() {
        this.isEnabled = true;
        console.log('Automatic scene switching enabled');
        
        this.emitEvent('scene-switcher-enabled', {
            reason: 'user_enabled'
        });
    }

    disable() {
        this.isEnabled = false;
        console.log('Automatic scene switching disabled');
        
        // Clear any pending switches
        if (this.switchTimeout) {
            clearTimeout(this.switchTimeout);
            this.switchTimeout = null;
        }
        
        this.emitEvent('scene-switcher-disabled', {
            reason: 'user_disabled'
        });
    }

    setSwitchDelay(delay) {
        this.switchDelay = Math.max(100, Math.min(5000, delay)); // Between 100ms and 5s
        console.log(`Scene switch delay set to ${this.switchDelay}ms`);
        
        this.emitEvent('switch-delay-changed', {
            delay: this.switchDelay
        });
    }

    // Status and monitoring methods
    getStatus() {
        return {
            enabled: this.isEnabled,
            obsConnected: this.obsController.isConnected,
            lastActiveTab: this.lastActiveTab,
            switchDelay: this.switchDelay,
            pendingSwitch: this.switchTimeout !== null,
            sceneHistory: [...this.sceneHistory]
        };
    }

    getSceneHistory(limit = 10) {
        return this.sceneHistory.slice(-limit);
    }

    getStatistics() {
        const stats = {
            totalSwitches: this.sceneHistory.length,
            switchesByApp: {},
            averageSwitchTime: 0,
            lastSwitchTime: null
        };
        
        // Calculate statistics from history
        this.sceneHistory.forEach(record => {
            const app = record.activeTab;
            stats.switchesByApp[app] = (stats.switchesByApp[app] || 0) + 1;
            
            if (!stats.lastSwitchTime || record.timestamp > stats.lastSwitchTime) {
                stats.lastSwitchTime = record.timestamp;
            }
        });
        
        return stats;
    }

    // Manual scene switching
    async manualSceneSwitch(appName) {
        console.log(`Manual scene switch requested for ${appName}`);
        
        // Temporarily disable automatic switching
        const wasEnabled = this.isEnabled;
        this.isEnabled = false;
        
        try {
            const success = await this.performSceneSwitch(appName, this.lastActiveTab);
            
            this.emitEvent('manual-scene-switch', {
                appName,
                success
            });
            
            return success;
        } finally {
            // Restore automatic switching state
            this.isEnabled = wasEnabled;
        }
    }

    // Scene mapping management
    updateSceneMapping(appName, sceneName) {
        if (this.obsController) {
            this.obsController.updateSceneMapping(appName, sceneName);
            
            this.emitEvent('scene-mapping-updated', {
                appName,
                sceneName
            });
            
            console.log(`Scene mapping updated: ${appName} -> ${sceneName}`);
        }
    }

    getSceneMapping() {
        return this.obsController ? { ...this.obsController.sceneMapping } : {};
    }

    // Event emission
    emitEvent(eventName, data = {}) {
        const event = new CustomEvent(`scene-switcher-${eventName}`, {
            detail: {
                ...data,
                timestamp: Date.now()
            }
        });
        document.dispatchEvent(event);
    }

    // Cleanup
    destroy() {
        console.log('Destroying Automatic Scene Switcher...');
        
        // Clear any pending switches
        if (this.switchTimeout) {
            clearTimeout(this.switchTimeout);
            this.switchTimeout = null;
        }
        
        // Clear history
        this.sceneHistory = [];
        
        this.emitEvent('scene-switcher-destroyed');
    }
}

// Export for use in main scripts
window.AutomaticSceneSwitcher = AutomaticSceneSwitcher;