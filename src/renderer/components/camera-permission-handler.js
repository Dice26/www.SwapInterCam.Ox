/**
 * Camera Permission Handler
 * Manages camera permissions and user consent flow for SwapInterCam
 */

class CameraPermissionHandler {
    constructor() {
        this.permissionState = 'unknown';
        this.retryAttempts = 0;
        this.maxRetryAttempts = 3;
        this.retryDelay = 2000; // 2 seconds
        this.permissionCheckInterval = null;
        this.eventListeners = new Map();
        
        // Initialize permission monitoring
        this.initialize();
    }

    async initialize() {
        console.log('🔐 Initializing Camera Permission Handler...');
        
        try {
            // Check initial permission state
            await this.checkPermissions();
            
            // Start permission monitoring
            this.startPermissionMonitoring();
            
            console.log('✅ Camera Permission Handler initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Camera Permission Handler:', error);
        }
    }

    /**
     * Check current camera permission state
     * @returns {Promise<Object>} Permission status object
     */
    async checkPermissions() {
        console.log('🔍 Checking camera permissions...');
        
        try {
            // Method 1: Use Permissions API if available
            if (navigator.permissions && navigator.permissions.query) {
                try {
                    const permissionStatus = await navigator.permissions.query({ name: 'camera' });
                    this.permissionState = permissionStatus.state;
                    
                    console.log(`📋 Permission API state: ${this.permissionState}`);
                    
                    // Listen for permission changes
                    permissionStatus.onchange = () => {
                        const oldState = this.permissionState;
                        this.permissionState = permissionStatus.state;
                        console.log(`🔄 Permission changed: ${oldState} → ${this.permissionState}`);
                        this.emitEvent('permission-changed', {
                            oldState,
                            newState: this.permissionState
                        });
                    };
                    
                    return {
                        success: true,
                        state: this.permissionState,
                        method: 'permissions-api'
                    };
                } catch (permApiError) {
                    console.warn('⚠️ Permissions API failed:', permApiError);
                }
            }
            
            // Method 2: Try to access camera to determine permission state
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { width: 1, height: 1 } // Minimal request
                });
                
                // If we get here, permission is granted
                this.permissionState = 'granted';
                
                // Clean up test stream
                stream.getTracks().forEach(track => track.stop());
                
                console.log('✅ Camera access test successful - permission granted');
                
                return {
                    success: true,
                    state: 'granted',
                    method: 'media-access-test'
                };
                
            } catch (mediaError) {
                // Analyze the error to determine permission state
                const permissionState = this.analyzeMediaError(mediaError);
                this.permissionState = permissionState;
                
                console.log(`📋 Media access test result: ${permissionState}`);
                
                return {
                    success: true,
                    state: permissionState,
                    method: 'media-error-analysis',
                    error: mediaError.message
                };
            }
            
        } catch (error) {
            console.error('❌ Permission check failed:', error);
            this.permissionState = 'unknown';
            
            return {
                success: false,
                state: 'unknown',
                error: error.message
            };
        }
    }

    /**
     * Analyze media access error to determine permission state
     * @param {Error} error - The media access error
     * @returns {string} Permission state
     */
    analyzeMediaError(error) {
        const errorName = error.name?.toLowerCase() || '';
        const errorMessage = error.message?.toLowerCase() || '';
        
        // Permission denied errors
        if (errorName.includes('notallowed') || 
            errorMessage.includes('permission denied') ||
            errorMessage.includes('not allowed') ||
            errorMessage.includes('denied')) {
            return 'denied';
        }
        
        // No devices found
        if (errorName.includes('notfound') ||
            errorMessage.includes('no device') ||
            errorMessage.includes('not found')) {
            return 'granted'; // Permission OK, but no camera
        }
        
        // Device in use
        if (errorName.includes('notreadable') ||
            errorMessage.includes('in use') ||
            errorMessage.includes('busy')) {
            return 'granted'; // Permission OK, but camera busy
        }
        
        // Constraints not satisfied
        if (errorName.includes('overconstrained') ||
            errorMessage.includes('constraint')) {
            return 'granted'; // Permission OK, but constraints issue
        }
        
        // Default to prompt for unknown errors
        return 'prompt';
    }

    /**
     * Request camera permissions from user
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Request result
     */
    async requestPermissions(options = {}) {
        console.log('🙋 Requesting camera permissions...');
        
        const {
            showUserGuidance = true,
            retryOnFailure = true,
            constraints = { video: true }
        } = options;
        
        try {
            // Show user guidance if requested
            if (showUserGuidance) {
                this.showPermissionGuidance();
            }
            
            // Request camera access
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Success - update state
            this.permissionState = 'granted';
            this.retryAttempts = 0;
            
            // Clean up stream
            stream.getTracks().forEach(track => track.stop());
            
            console.log('✅ Camera permission granted');
            
            // Hide guidance
            this.hidePermissionGuidance();
            
            // Emit success event
            this.emitEvent('permission-granted', {
                method: 'user-request',
                constraints
            });
            
            return {
                success: true,
                state: 'granted',
                message: 'Camera permission granted successfully'
            };
            
        } catch (error) {
            console.error('❌ Permission request failed:', error);
            
            const permissionState = this.analyzeMediaError(error);
            this.permissionState = permissionState;
            
            // Handle different failure scenarios
            if (permissionState === 'denied') {
                this.handlePermissionDenied(error, retryOnFailure);
            }
            
            // Emit failure event
            this.emitEvent('permission-denied', {
                error: error.message,
                state: permissionState,
                retryAttempts: this.retryAttempts
            });
            
            return {
                success: false,
                state: permissionState,
                error: error.message,
                guidance: this.getPermissionGuidance(permissionState)
            };
        }
    }

    /**
     * Handle permission denied scenario
     * @param {Error} error - The permission error
     * @param {boolean} retryOnFailure - Whether to retry
     */
    async handlePermissionDenied(error, retryOnFailure = true) {
        console.log('🚫 Camera permission denied');
        
        this.retryAttempts++;
        
        // Show detailed error guidance
        this.showPermissionDeniedGuidance(error);
        
        // Attempt retry if enabled and within limits
        if (retryOnFailure && this.retryAttempts < this.maxRetryAttempts) {
            console.log(`🔄 Scheduling retry attempt ${this.retryAttempts}/${this.maxRetryAttempts}...`);
            
            setTimeout(() => {
                this.requestPermissions({ 
                    showUserGuidance: false, 
                    retryOnFailure: true 
                });
            }, this.retryDelay * this.retryAttempts); // Exponential backoff
        } else {
            console.log('❌ Max retry attempts reached or retry disabled');
            this.showFinalPermissionError();
        }
    }

    /**
     * Show permission request guidance to user
     */
    showPermissionGuidance() {
        console.log('💡 Showing permission guidance...');
        
        // Remove existing guidance
        this.hidePermissionGuidance();
        
        const guidanceDiv = document.createElement('div');
        guidanceDiv.id = 'camera-permission-guidance';
        guidanceDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            z-index: 10001;
            max-width: 450px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        guidanceDiv.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 20px;">📹</div>
            <h3 style="margin: 0 0 15px 0; font-size: 24px;">Camera Access Required</h3>
            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; opacity: 0.9;">
                SwapInterCam needs access to your camera for face swap features and video preview.
            </p>
            <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 14px; line-height: 1.4;">
                    <strong>What happens next:</strong><br>
                    1. Your browser will ask for camera permission<br>
                    2. Click "Allow" to enable camera features<br>
                    3. Your camera feed will appear in the preview
                </p>
            </div>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button onclick="window.cameraPermissionHandler.requestPermissions()" style="
                    background: #27ae60;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 600;
                ">Grant Access</button>
                <button onclick="window.cameraPermissionHandler.hidePermissionGuidance()" style="
                    background: rgba(255,255,255,0.2);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 16px;
                ">Cancel</button>
            </div>
        `;
        
        document.body.appendChild(guidanceDiv);
        
        // Auto-hide after 30 seconds
        setTimeout(() => {
            this.hidePermissionGuidance();
        }, 30000);
    }

    /**
     * Show permission denied guidance
     * @param {Error} error - The permission error
     */
    showPermissionDeniedGuidance(error) {
        console.log('🚫 Showing permission denied guidance...');
        
        this.hidePermissionGuidance();
        
        const guidanceDiv = document.createElement('div');
        guidanceDiv.id = 'camera-permission-denied-guidance';
        guidanceDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            z-index: 10001;
            max-width: 500px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        const guidance = this.getPermissionGuidance('denied');
        
        guidanceDiv.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 20px;">🚫</div>
            <h3 style="margin: 0 0 15px 0; font-size: 24px;">Camera Access Denied</h3>
            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; opacity: 0.9;">
                Camera permission was denied. To use face swap features, please enable camera access.
            </p>
            <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: left;">
                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">How to enable camera access:</p>
                ${guidance.steps.map(step => `<p style="margin: 5px 0; font-size: 13px;">• ${step}</p>`).join('')}
            </div>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button onclick="window.cameraPermissionHandler.requestPermissions()" style="
                    background: #27ae60;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 600;
                ">Try Again</button>
                <button onclick="window.cameraPermissionHandler.hidePermissionGuidance()" style="
                    background: rgba(255,255,255,0.2);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 16px;
                ">Close</button>
            </div>
        `;
        
        document.body.appendChild(guidanceDiv);
    }

    /**
     * Show final permission error when all retries exhausted
     */
    showFinalPermissionError() {
        console.log('❌ Showing final permission error...');
        
        this.hidePermissionGuidance();
        
        const errorDiv = document.createElement('div');
        errorDiv.id = 'camera-permission-final-error';
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            z-index: 10001;
            max-width: 450px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        errorDiv.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
            <h3 style="margin: 0 0 15px 0; font-size: 24px;">Camera Access Required</h3>
            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; opacity: 0.9;">
                SwapInterCam cannot function without camera access. Some features will be disabled.
            </p>
            <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 14px; line-height: 1.4;">
                    <strong>Available without camera:</strong><br>
                    • Chat platform access<br>
                    • Settings and configuration<br>
                    • OBS integration (limited)
                </p>
            </div>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button onclick="window.cameraPermissionHandler.requestPermissions()" style="
                    background: #3498db;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 600;
                ">Try Again</button>
                <button onclick="window.cameraPermissionHandler.hidePermissionGuidance()" style="
                    background: rgba(255,255,255,0.2);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 16px;
                ">Continue Without Camera</button>
            </div>
        `;
        
        document.body.appendChild(errorDiv);
    }

    /**
     * Hide permission guidance dialogs
     */
    hidePermissionGuidance() {
        const guidanceElements = [
            'camera-permission-guidance',
            'camera-permission-denied-guidance',
            'camera-permission-final-error'
        ];
        
        guidanceElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.remove();
            }
        });
    }

    /**
     * Get system-specific permission guidance
     * @param {string} permissionState - Current permission state
     * @returns {Object} Guidance object
     */
    getPermissionGuidance(permissionState) {
        const isChrome = navigator.userAgent.includes('Chrome');
        const isFirefox = navigator.userAgent.includes('Firefox');
        const isEdge = navigator.userAgent.includes('Edge');
        
        const baseGuidance = {
            denied: {
                title: 'Camera Access Denied',
                message: 'Please enable camera access to use face swap features.',
                steps: []
            },
            prompt: {
                title: 'Camera Permission Required',
                message: 'Click "Allow" when prompted to enable camera access.',
                steps: ['Click the camera icon in your browser\'s address bar', 'Select "Allow" for camera access', 'Refresh the page if needed']
            }
        };
        
        // Browser-specific guidance
        if (isChrome || isEdge) {
            baseGuidance.denied.steps = [
                'Click the camera icon in the address bar',
                'Select "Always allow" for camera access',
                'Refresh the page',
                'Or go to Settings > Privacy > Camera and allow this site'
            ];
        } else if (isFirefox) {
            baseGuidance.denied.steps = [
                'Click the shield icon in the address bar',
                'Click "Allow" next to camera permissions',
                'Refresh the page',
                'Or go to Preferences > Privacy & Security > Permissions'
            ];
        } else {
            baseGuidance.denied.steps = [
                'Look for a camera icon in your browser',
                'Click it and select "Allow"',
                'Refresh the page',
                'Check your browser\'s privacy settings'
            ];
        }
        
        return baseGuidance[permissionState] || baseGuidance.prompt;
    }

    /**
     * Start monitoring permission changes
     */
    startPermissionMonitoring() {
        console.log('👁️ Starting permission monitoring...');
        
        // Check permissions every 10 seconds
        this.permissionCheckInterval = setInterval(async () => {
            const oldState = this.permissionState;
            await this.checkPermissions();
            
            if (oldState !== this.permissionState) {
                console.log(`🔄 Permission state changed: ${oldState} → ${this.permissionState}`);
                this.emitEvent('permission-changed', {
                    oldState,
                    newState: this.permissionState
                });
            }
        }, 10000);
    }

    /**
     * Stop permission monitoring
     */
    stopPermissionMonitoring() {
        if (this.permissionCheckInterval) {
            clearInterval(this.permissionCheckInterval);
            this.permissionCheckInterval = null;
            console.log('⏹️ Permission monitoring stopped');
        }
    }

    /**
     * Add event listener
     * @param {string} eventName - Event name
     * @param {Function} callback - Event callback
     */
    addEventListener(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, []);
        }
        this.eventListeners.get(eventName).push(callback);
    }

    /**
     * Remove event listener
     * @param {string} eventName - Event name
     * @param {Function} callback - Event callback
     */
    removeEventListener(eventName, callback) {
        if (this.eventListeners.has(eventName)) {
            const listeners = this.eventListeners.get(eventName);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Emit event to listeners
     * @param {string} eventName - Event name
     * @param {Object} data - Event data
     */
    emitEvent(eventName, data = {}) {
        console.log(`📡 Emitting event: ${eventName}`, data);
        
        // Internal listeners
        if (this.eventListeners.has(eventName)) {
            this.eventListeners.get(eventName).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${eventName}:`, error);
                }
            });
        }
        
        // DOM event
        const event = new CustomEvent(`camera-permission-${eventName}`, {
            detail: { ...data, timestamp: Date.now() }
        });
        document.dispatchEvent(event);
    }

    /**
     * Get current permission status
     * @returns {Object} Status object
     */
    getStatus() {
        return {
            state: this.permissionState,
            retryAttempts: this.retryAttempts,
            maxRetryAttempts: this.maxRetryAttempts,
            isMonitoring: this.permissionCheckInterval !== null,
            timestamp: Date.now()
        };
    }

    /**
     * Reset retry attempts
     */
    resetRetryAttempts() {
        this.retryAttempts = 0;
        console.log('🔄 Retry attempts reset');
    }

    /**
     * Destroy the permission handler
     */
    destroy() {
        console.log('🧹 Destroying Camera Permission Handler...');
        
        this.stopPermissionMonitoring();
        this.hidePermissionGuidance();
        this.eventListeners.clear();
        
        console.log('✅ Camera Permission Handler destroyed');
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (!window.cameraPermissionHandler) {
        window.cameraPermissionHandler = new CameraPermissionHandler();
    }
});

// Also initialize immediately if DOM is already loaded
if (document.readyState !== 'loading' && !window.cameraPermissionHandler) {
    window.cameraPermissionHandler = new CameraPermissionHandler();
}

// Export for use
window.CameraPermissionHandler = CameraPermissionHandler;