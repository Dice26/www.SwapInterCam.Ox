/**
 * Camera Permission Recovery System
 * Provides comprehensive error recovery and user guidance for camera permission issues
 */

class CameraPermissionRecovery {
    constructor() {
        this.recoveryStrategies = new Map();
        this.systemDetector = new SystemDetector();
        this.guidanceTemplates = new Map();
        this.recoveryAttempts = new Map();
        this.maxRecoveryAttempts = 5;
        
        this.initialize();
    }

    initialize() {
        console.log('🔧 Initializing Camera Permission Recovery System...');
        
        // Setup recovery strategies
        this.setupRecoveryStrategies();
        
        // Setup guidance templates
        this.setupGuidanceTemplates();
        
        // Listen for permission events
        this.setupEventListeners();
        
        console.log('✅ Camera Permission Recovery System initialized');
    }

    /**
     * Setup recovery strategies for different scenarios
     */
    setupRecoveryStrategies() {
        // Strategy 1: Browser-specific permission reset
        this.recoveryStrategies.set('browser-reset', {
            name: 'Browser Permission Reset',
            description: 'Reset browser permissions and try again',
            execute: async () => await this.executeBrowserReset(),
            priority: 1,
            conditions: ['denied', 'blocked']
        });

        // Strategy 2: Alternative camera access
        this.recoveryStrategies.set('alternative-access', {
            name: 'Alternative Camera Access',
            description: 'Try different camera access methods',
            execute: async () => await this.executeAlternativeAccess(),
            priority: 2,
            conditions: ['denied', 'notfound', 'notreadable']
        });

        // Strategy 3: System-level guidance
        this.recoveryStrategies.set('system-guidance', {
            name: 'System-Level Guidance',
            description: 'Provide OS-specific camera permission guidance',
            execute: async () => await this.executeSystemGuidance(),
            priority: 3,
            conditions: ['denied', 'blocked']
        });

        // Strategy 4: Fallback mode
        this.recoveryStrategies.set('fallback-mode', {
            name: 'Fallback Mode',
            description: 'Enable limited functionality without camera',
            execute: async () => await this.executeFallbackMode(),
            priority: 4,
            conditions: ['denied', 'notfound', 'blocked']
        });

        // Strategy 5: Manual intervention
        this.recoveryStrategies.set('manual-intervention', {
            name: 'Manual Intervention Required',
            description: 'Guide user through manual permission setup',
            execute: async () => await this.executeManualIntervention(),
            priority: 5,
            conditions: ['denied', 'blocked', 'unknown']
        });
    }

    /**
     * Setup guidance templates for different systems and browsers
     */
    setupGuidanceTemplates() {
        // Windows Chrome guidance
        this.guidanceTemplates.set('windows-chrome', {
            title: 'Enable Camera in Chrome (Windows)',
            steps: [
                'Click the camera icon 📹 in the address bar',
                'Select "Always allow on this site"',
                'If no icon appears, click the three dots menu → Settings',
                'Go to Privacy and security → Site Settings → Camera',
                'Find this website and change to "Allow"',
                'Refresh the page and try again'
            ],
            videoUrl: null,
            troubleshooting: [
                'Make sure no other apps are using your camera',
                'Try restarting your browser',
                'Check Windows camera privacy settings'
            ]
        });

        // Windows Firefox guidance
        this.guidanceTemplates.set('windows-firefox', {
            title: 'Enable Camera in Firefox (Windows)',
            steps: [
                'Click the shield icon 🛡️ in the address bar',
                'Click "Allow" next to Camera permissions',
                'If blocked, go to Firefox menu → Preferences',
                'Navigate to Privacy & Security → Permissions',
                'Click "Settings" next to Camera',
                'Find this website and select "Allow"',
                'Refresh the page'
            ],
            videoUrl: null,
            troubleshooting: [
                'Clear Firefox cache and cookies',
                'Disable browser extensions temporarily',
                'Check if camera works in other applications'
            ]
        });

        // Windows Edge guidance
        this.guidanceTemplates.set('windows-edge', {
            title: 'Enable Camera in Microsoft Edge (Windows)',
            steps: [
                'Click the camera icon in the address bar',
                'Select "Allow" for camera access',
                'If needed, go to Edge menu → Settings',
                'Navigate to Site permissions → Camera',
                'Add this website to allowed sites',
                'Restart Edge and try again'
            ],
            videoUrl: null,
            troubleshooting: [
                'Reset Edge permissions',
                'Check Windows 10/11 camera privacy settings',
                'Update Edge to latest version'
            ]
        });

        // Windows system-level guidance
        this.guidanceTemplates.set('windows-system', {
            title: 'Windows Camera Privacy Settings',
            steps: [
                'Open Windows Settings (Win + I)',
                'Go to Privacy → Camera',
                'Make sure "Allow apps to access your camera" is ON',
                'Scroll down and ensure your browser is allowed',
                'If using Windows 11, check "Allow desktop apps to access your camera"',
                'Restart your browser after making changes'
            ],
            videoUrl: null,
            troubleshooting: [
                'Check Device Manager for camera driver issues',
                'Run Windows Camera troubleshooter',
                'Update camera drivers',
                'Check antivirus camera blocking settings'
            ]
        });
    }

    /**
     * Setup event listeners for permission recovery
     */
    setupEventListeners() {
        // Listen for permission denied events
        document.addEventListener('camera-permission-denied', (event) => {
            this.handlePermissionDenied(event.detail);
        });

        // Listen for permission errors
        document.addEventListener('camera-permission-error', (event) => {
            this.handlePermissionError(event.detail);
        });

        // Listen for recovery requests
        document.addEventListener('camera-permission-recovery-request', (event) => {
            this.initiateRecovery(event.detail);
        });
    }

    /**
     * Handle permission denied scenario
     * @param {Object} eventData - Event data from permission handler
     */
    async handlePermissionDenied(eventData) {
        console.log('🚫 Handling permission denied scenario:', eventData);
        
        const { error, state, retryAttempts } = eventData;
        const recoveryKey = `denied-${Date.now()}`;
        
        // Track recovery attempts
        this.recoveryAttempts.set(recoveryKey, {
            startTime: Date.now(),
            attempts: retryAttempts || 0,
            lastError: error,
            state: state
        });

        // Determine appropriate recovery strategy
        const strategy = this.selectRecoveryStrategy(state, retryAttempts);
        
        if (strategy) {
            console.log(`🔧 Executing recovery strategy: ${strategy.name}`);
            await this.executeRecoveryStrategy(strategy, recoveryKey);
        } else {
            console.log('❌ No suitable recovery strategy found');
            await this.showFinalErrorGuidance(eventData);
        }
    }

    /**
     * Handle general permission errors
     * @param {Object} eventData - Error event data
     */
    async handlePermissionError(eventData) {
        console.log('❌ Handling permission error:', eventData);
        
        const { error, context } = eventData;
        
        // Analyze error and provide specific guidance
        const errorAnalysis = this.analyzePermissionError(error);
        await this.showErrorSpecificGuidance(errorAnalysis, context);
    }

    /**
     * Select appropriate recovery strategy
     * @param {string} permissionState - Current permission state
     * @param {number} retryAttempts - Number of retry attempts
     * @returns {Object|null} Recovery strategy
     */
    selectRecoveryStrategy(permissionState, retryAttempts = 0) {
        const availableStrategies = Array.from(this.recoveryStrategies.values())
            .filter(strategy => strategy.conditions.includes(permissionState))
            .sort((a, b) => a.priority - b.priority);

        // Select strategy based on retry attempts
        if (retryAttempts < 2) {
            return availableStrategies.find(s => s.name === 'Browser Permission Reset');
        } else if (retryAttempts < 4) {
            return availableStrategies.find(s => s.name === 'Alternative Camera Access') ||
                   availableStrategies.find(s => s.name === 'System-Level Guidance');
        } else {
            return availableStrategies.find(s => s.name === 'Manual Intervention Required') ||
                   availableStrategies.find(s => s.name === 'Fallback Mode');
        }
    }

    /**
     * Execute recovery strategy
     * @param {Object} strategy - Recovery strategy
     * @param {string} recoveryKey - Recovery tracking key
     */
    async executeRecoveryStrategy(strategy, recoveryKey) {
        try {
            console.log(`🔧 Executing strategy: ${strategy.name}`);
            
            const result = await strategy.execute();
            
            if (result.success) {
                console.log(`✅ Recovery strategy succeeded: ${strategy.name}`);
                this.recoveryAttempts.delete(recoveryKey);
                
                // Emit success event
                this.emitRecoveryEvent('recovery-success', {
                    strategy: strategy.name,
                    result: result
                });
            } else {
                console.log(`⚠️ Recovery strategy failed: ${strategy.name}`);
                await this.handleRecoveryFailure(strategy, recoveryKey, result);
            }
            
        } catch (error) {
            console.error(`❌ Recovery strategy error: ${strategy.name}`, error);
            await this.handleRecoveryFailure(strategy, recoveryKey, { error: error.message });
        }
    }

    /**
     * Execute browser reset recovery strategy
     */
    async executeBrowserReset() {
        console.log('🔄 Executing browser reset strategy...');
        
        const systemInfo = this.systemDetector.getSystemInfo();
        const guidance = this.getGuidanceForSystem(systemInfo);
        
        return new Promise((resolve) => {
            this.showInteractiveGuidance({
                title: 'Reset Browser Permissions',
                message: 'Let\'s reset your browser permissions and try again.',
                steps: guidance.steps,
                onComplete: () => {
                    // Request permissions again after user follows guidance
                    setTimeout(async () => {
                        try {
                            if (window.cameraPermissionHandler) {
                                const result = await window.cameraPermissionHandler.requestPermissions({
                                    showUserGuidance: false,
                                    retryOnFailure: false
                                });
                                resolve(result);
                            } else {
                                resolve({ success: false, error: 'Permission handler not available' });
                            }
                        } catch (error) {
                            resolve({ success: false, error: error.message });
                        }
                    }, 2000);
                },
                onSkip: () => {
                    resolve({ success: false, error: 'User skipped browser reset' });
                }
            });
        });
    }

    /**
     * Execute alternative camera access strategy
     */
    async executeAlternativeAccess() {
        console.log('🔄 Executing alternative access strategy...');
        
        const alternativeConstraints = [
            // Try with minimal constraints
            { video: { width: 320, height: 240 } },
            // Try with different frame rate
            { video: { frameRate: { ideal: 15, max: 30 } } },
            // Try with specific device if available
            { video: { deviceId: { ideal: 'default' } } },
            // Try audio + video (sometimes helps)
            { video: true, audio: false }
        ];

        for (const constraints of alternativeConstraints) {
            try {
                console.log('🔄 Trying alternative constraints:', constraints);
                
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                
                // Success - clean up and return
                stream.getTracks().forEach(track => track.stop());
                
                console.log('✅ Alternative access successful');
                return {
                    success: true,
                    method: 'alternative-constraints',
                    constraints: constraints
                };
                
            } catch (error) {
                console.log('⚠️ Alternative constraint failed:', error.message);
                continue;
            }
        }
        
        return {
            success: false,
            error: 'All alternative access methods failed'
        };
    }

    /**
     * Execute system-level guidance strategy
     */
    async executeSystemGuidance() {
        console.log('🔄 Executing system guidance strategy...');
        
        const systemInfo = this.systemDetector.getSystemInfo();
        const systemGuidance = this.guidanceTemplates.get(`${systemInfo.os}-system`);
        
        if (systemGuidance) {
            return new Promise((resolve) => {
                this.showSystemGuidance(systemGuidance, {
                    onComplete: () => resolve({ success: true, method: 'system-guidance' }),
                    onSkip: () => resolve({ success: false, error: 'User skipped system guidance' })
                });
            });
        } else {
            return {
                success: false,
                error: 'No system guidance available for this platform'
            };
        }
    }

    /**
     * Execute fallback mode strategy
     */
    async executeFallbackMode() {
        console.log('🔄 Executing fallback mode strategy...');
        
        // Enable limited functionality without camera
        this.showFallbackModeDialog();
        
        // Disable camera-dependent features
        this.disableCameraFeatures();
        
        // Enable alternative features
        this.enableAlternativeFeatures();
        
        return {
            success: true,
            method: 'fallback-mode',
            message: 'Application running in limited mode without camera'
        };
    }

    /**
     * Execute manual intervention strategy
     */
    async executeManualIntervention() {
        console.log('🔄 Executing manual intervention strategy...');
        
        const systemInfo = this.systemDetector.getSystemInfo();
        const guidance = this.getGuidanceForSystem(systemInfo);
        
        return new Promise((resolve) => {
            this.showManualInterventionDialog(guidance, {
                onRetry: async () => {
                    // User indicates they've made manual changes
                    try {
                        if (window.cameraPermissionHandler) {
                            const result = await window.cameraPermissionHandler.requestPermissions({
                                showUserGuidance: false,
                                retryOnFailure: false
                            });
                            resolve(result);
                        } else {
                            resolve({ success: false, error: 'Permission handler not available' });
                        }
                    } catch (error) {
                        resolve({ success: false, error: error.message });
                    }
                },
                onGiveUp: () => {
                    resolve({ success: false, error: 'User gave up on manual intervention' });
                }
            });
        });
    }

    /**
     * Show interactive guidance dialog
     * @param {Object} options - Guidance options
     */
    showInteractiveGuidance(options) {
        const { title, message, steps, onComplete, onSkip } = options;
        
        // Remove existing guidance
        this.hideAllGuidance();
        
        const guidanceDiv = document.createElement('div');
        guidanceDiv.id = 'camera-recovery-guidance';
        guidanceDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            z-index: 10002;
            max-width: 550px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        guidanceDiv.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 20px;">🔧</div>
            <h3 style="margin: 0 0 15px 0; font-size: 24px;">${title}</h3>
            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; opacity: 0.9;">
                ${message}
            </p>
            <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 8px; margin-bottom: 25px; text-align: left;">
                <p style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; text-align: center;">Follow these steps:</p>
                ${steps.map((step, index) => `
                    <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
                        <span style="background: rgba(255,255,255,0.2); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 12px; flex-shrink: 0;">${index + 1}</span>
                        <span style="font-size: 14px; line-height: 1.4;">${step}</span>
                    </div>
                `).join('')}
            </div>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button onclick="this.parentElement.parentElement.querySelector('.complete-btn').click()" class="complete-btn" style="
                    background: #27ae60;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 600;
                ">I've Done This</button>
                <button onclick="this.parentElement.parentElement.querySelector('.skip-btn').click()" class="skip-btn" style="
                    background: rgba(255,255,255,0.2);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 16px;
                ">Skip This Step</button>
            </div>
        `;
        
        // Add event listeners
        const completeBtn = guidanceDiv.querySelector('.complete-btn');
        const skipBtn = guidanceDiv.querySelector('.skip-btn');
        
        completeBtn.onclick = () => {
            this.hideAllGuidance();
            onComplete();
        };
        
        skipBtn.onclick = () => {
            this.hideAllGuidance();
            onSkip();
        };
        
        document.body.appendChild(guidanceDiv);
    }

    /**
     * Show system-level guidance
     * @param {Object} guidance - System guidance object
     * @param {Object} callbacks - Callback functions
     */
    showSystemGuidance(guidance, callbacks) {
        const { onComplete, onSkip } = callbacks;
        
        this.hideAllGuidance();
        
        const guidanceDiv = document.createElement('div');
        guidanceDiv.id = 'camera-system-guidance';
        guidanceDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            z-index: 10002;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        guidanceDiv.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 20px;">⚙️</div>
            <h3 style="margin: 0 0 15px 0; font-size: 24px;">${guidance.title}</h3>
            <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.5; opacity: 0.9;">
                These system-level changes will help resolve camera access issues.
            </p>
            
            <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: left;">
                <p style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; text-align: center;">System Settings:</p>
                ${guidance.steps.map((step, index) => `
                    <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
                        <span style="background: rgba(255,255,255,0.2); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 12px; flex-shrink: 0;">${index + 1}</span>
                        <span style="font-size: 14px; line-height: 1.4;">${step}</span>
                    </div>
                `).join('')}
            </div>
            
            ${guidance.troubleshooting ? `
                <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 25px; text-align: left;">
                    <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; text-align: center;">If problems persist:</p>
                    ${guidance.troubleshooting.map(tip => `
                        <p style="margin: 5px 0; font-size: 13px; opacity: 0.8;">• ${tip}</p>
                    `).join('')}
                </div>
            ` : ''}
            
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button class="complete-btn" style="
                    background: #27ae60;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 600;
                ">Settings Updated</button>
                <button class="skip-btn" style="
                    background: rgba(255,255,255,0.2);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 16px;
                ">Skip System Settings</button>
            </div>
        `;
        
        // Add event listeners
        guidanceDiv.querySelector('.complete-btn').onclick = () => {
            this.hideAllGuidance();
            onComplete();
        };
        
        guidanceDiv.querySelector('.skip-btn').onclick = () => {
            this.hideAllGuidance();
            onSkip();
        };
        
        document.body.appendChild(guidanceDiv);
    }

    /**
     * Get guidance for current system
     * @param {Object} systemInfo - System information
     * @returns {Object} Guidance object
     */
    getGuidanceForSystem(systemInfo) {
        const key = `${systemInfo.os}-${systemInfo.browser}`;
        return this.guidanceTemplates.get(key) || this.guidanceTemplates.get('windows-chrome');
    }

    /**
     * Hide all guidance dialogs
     */
    hideAllGuidance() {
        const guidanceIds = [
            'camera-recovery-guidance',
            'camera-system-guidance',
            'camera-fallback-dialog',
            'camera-manual-intervention'
        ];
        
        guidanceIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.remove();
            }
        });
    }

    /**
     * Emit recovery event
     * @param {string} eventName - Event name
     * @param {Object} data - Event data
     */
    emitRecoveryEvent(eventName, data = {}) {
        const event = new CustomEvent(`camera-recovery-${eventName}`, {
            detail: { ...data, timestamp: Date.now() }
        });
        document.dispatchEvent(event);
    }

    /**
     * Get recovery status
     * @returns {Object} Recovery status
     */
    getRecoveryStatus() {
        return {
            activeRecoveries: this.recoveryAttempts.size,
            availableStrategies: this.recoveryStrategies.size,
            systemInfo: this.systemDetector.getSystemInfo()
        };
    }

    /**
     * Destroy the recovery system
     */
    destroy() {
        console.log('🧹 Destroying Camera Permission Recovery System...');
        
        this.hideAllGuidance();
        this.recoveryAttempts.clear();
        this.recoveryStrategies.clear();
        this.guidanceTemplates.clear();
        
        console.log('✅ Camera Permission Recovery System destroyed');
    }
}

/**
 * System Detector Helper Class
 */
class SystemDetector {
    getSystemInfo() {
        const userAgent = navigator.userAgent;
        
        // Detect OS
        let os = 'unknown';
        if (userAgent.includes('Windows')) os = 'windows';
        else if (userAgent.includes('Mac')) os = 'mac';
        else if (userAgent.includes('Linux')) os = 'linux';
        
        // Detect Browser
        let browser = 'unknown';
        if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) browser = 'chrome';
        else if (userAgent.includes('Firefox')) browser = 'firefox';
        else if (userAgent.includes('Edge')) browser = 'edge';
        else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'safari';
        
        return { os, browser, userAgent };
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (!window.cameraPermissionRecovery) {
        window.cameraPermissionRecovery = new CameraPermissionRecovery();
    }
});

// Also initialize immediately if DOM is already loaded
if (document.readyState !== 'loading' && !window.cameraPermissionRecovery) {
    window.cameraPermissionRecovery = new CameraPermissionRecovery();
}

// Export for use
window.CameraPermissionRecovery = CameraPermissionRecovery;