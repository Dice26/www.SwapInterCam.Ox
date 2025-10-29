// Tab Manager - Enhanced tab switching with state preservation and smooth transitions

class TabManager {
    constructor(webviewManager) {
        this.webviewManager = webviewManager;
        this.currentTab = 'whatsapp';
        this.tabHistory = ['whatsapp'];
        this.maxHistoryLength = 10;
        
        this.setupTabEventListeners();
    }

    setupTabEventListeners() {
        // Listen for tab button clicks
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const appName = e.currentTarget.dataset.app;
                this.switchToTab(appName);
            });
        });

        // Listen for keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.switchToTab('whatsapp');
                        break;
                    case '2':
                        e.preventDefault();
                        this.switchToTab('messenger');
                        break;
                    case '3':
                        e.preventDefault();
                        this.switchToTab('line');
                        break;
                    case 'Tab':
                        e.preventDefault();
                        this.switchToNextTab();
                        break;
                }
            }
        });
    }

    async switchToTab(appName, addToHistory = true) {
        if (this.currentTab === appName) {
            return true; // Already active
        }

        try {
            // Switch OBS scene for the new tab
            await this.switchOBSScene(appName);
        } catch (error) {
            this.log('OBS scene switching failed:', error.message);
            // Continue with tab switch even if OBS fails
        }

        console.log(`Tab Manager: Switching from ${this.currentTab} to ${appName}`);

        // Add current tab to history before switching
        if (addToHistory) {
            this.addToHistory(this.currentTab);
        }

        // Use webview manager to switch
        const success = this.webviewManager.switchToApp(appName);
        
        if (success) {
            const previousTab = this.currentTab;
            this.currentTab = appName;
            
            // Update tab visual states
            this.updateTabStates(appName);
            
            // Add smooth transition effect
            this.addTransitionEffect(previousTab, appName);
            
            // Update window title
            this.updateWindowTitle(appName);
            
            // Emit tab switch event
            this.emitTabSwitchEvent(previousTab, appName);
            
            return true;
        }
        
        return false;
    }

    switchToNextTab() {
        const tabs = ['whatsapp', 'messenger', 'line'];
        const currentIndex = tabs.indexOf(this.currentTab);
        const nextIndex = (currentIndex + 1) % tabs.length;
        
        this.switchToTab(tabs[nextIndex]);
    }

    switchToPreviousTab() {
        const tabs = ['whatsapp', 'messenger', 'line'];
        const currentIndex = tabs.indexOf(this.currentTab);
        const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
        
        this.switchToTab(tabs[prevIndex]);
    }

    goBackInHistory() {
        if (this.tabHistory.length > 0) {
            const previousTab = this.tabHistory.pop();
            this.switchToTab(previousTab, false); // Don't add to history
        }
    }

    addToHistory(tabName) {
        // Remove if already exists to avoid duplicates
        const index = this.tabHistory.indexOf(tabName);
        if (index > -1) {
            this.tabHistory.splice(index, 1);
        }
        
        // Add to end of history
        this.tabHistory.push(tabName);
        
        // Limit history length
        if (this.tabHistory.length > this.maxHistoryLength) {
            this.tabHistory.shift();
        }
    }

    updateTabStates(activeTab) {
        document.querySelectorAll('.tab-button').forEach(button => {
            const appName = button.dataset.app;
            
            if (appName === activeTab) {
                button.classList.add('active');
                button.setAttribute('aria-selected', 'true');
            } else {
                button.classList.remove('active');
                button.setAttribute('aria-selected', 'false');
            }
            
            // Update loading states
            const webviewData = this.webviewManager.getWebViewData(appName);
            if (webviewData) {
                if (webviewData.hasError) {
                    button.classList.add('error');
                    button.title = `${webviewData.config.name} - Connection Error`;
                } else if (!webviewData.isLoaded) {
                    button.classList.add('loading');
                    button.title = `${webviewData.config.name} - Loading...`;
                } else {
                    button.classList.remove('error', 'loading');
                    button.title = webviewData.config.name;
                }
            }
        });
    }

    addTransitionEffect(fromTab, toTab) {
        const fromContainer = (document.getElementById(`webview-${fromTab}`) || {});
        const toContainer = (document.getElementById(`webview-${toTab}`) || {});
        
        if (fromContainer && toContainer) {
            // Add transition classes
            fromContainer.classList.add('transitioning-out');
            toContainer.classList.add('transitioning-in');
            
            // Remove transition classes after animation
            setTimeout(() => {
                fromContainer.classList.remove('transitioning-out');
                toContainer.classList.remove('transitioning-in');
            }, 300);
        }
    }

    updateWindowTitle(appName) {
        const config = this.webviewManager.chatApps[appName];
        if (config) {
            document.title = `SwapInterCam Chat - ${config.name}`;
        }
    }

    emitTabSwitchEvent(fromTab, toTab) {
        const event = new CustomEvent('tab-switched', {
            detail: {
                from: fromTab,
                to: toTab,
                timestamp: Date.now()
            }
        });
        document.dispatchEvent(event);
    }

    getCurrentTab() {
        return this.currentTab;
    }

    getTabHistory() {
        return [...this.tabHistory]; // Return copy
    }

    isTabLoaded(appName) {
        return this.webviewManager.isWebViewLoaded(appName);
    }

    hasTabError(appName) {
        return this.webviewManager.hasWebViewError(appName);
    }

    reloadCurrentTab() {
        return this.webviewManager.reloadWebView(this.currentTab);
    }

    reloadTab(appName) {
        return this.webviewManager.reloadWebView(appName);
    }

    clearTabData(appName) {
        return this.webviewManager.clearWebViewData(appName);
    }

    // Get tab statistics
    getTabStats() {
        const stats = {}
        for (const appName of Object.keys(this.webviewManager.chatApps)) {
            const webviewData = this.webviewManager.getWebViewData(appName);
            stats[appName] = {
                isLoaded: webviewData ? webviewData.isLoaded : false,
                hasError: webviewData ? webviewData.hasError : false,
                isActive: appName === this.currentTab
            }
        }
        
        return stats;
    }

    /**
     * Switch OBS scene based on active tab
     */
    async switchOBSScene(tabName) {
        try {
            // Use the new scene manager IPC handler
            const result = await window.electronAPI.invoke('obs:switchSceneForTab', tabName);
            
            if (result.success) {
                console.log(`OBS scene switched to ${result.scene} for ${tabName}`);
                
                // Emit custom event for OBS scene switch
                const event = new CustomEvent('obs-scene-switched', {
                    detail: {
                        tab: tabName,
                        scene: result.scene,
                        timestamp: Date.now()
                    }
                });
                document.dispatchEvent(event);
                
                return true;
            } else {
                this.log(`Failed to switch OBS scene for ${tabName}:`, result.error);
                return false;
            }
        } catch (error) {
            this.log('OBS scene switching error:', error);
            return false;
        }
    }

    /**
     * Get OBS scene manager status
     */
    async getOBSSceneStatus() {
        try {
            const result = await window.electronAPI.invoke('obs:getSceneManagerStatus');
            return result.success ? result.status : null;
        } catch (error) {
            this.log('Failed to get OBS scene status:', error);
            return null;
        }
    }

    /**
     * Validate OBS scene mapping
     */
    async validateOBSScenes() {
        try {
            const result = await window.electronAPI.invoke('obs:validateSceneMapping');
            return result;
        } catch (error) {
            this.log('Failed to validate OBS scenes:', error);
            return { success: false, error: error.message }
        }
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] tab-manager ${level}: ${message}`;
        
        if (level === 'ERROR') {
            console.warn(logMessage);
        } else {
            console.log(logMessage);
        }
    }
}

// Export for use in main scripts
window.TabManager = TabManager;