/**
 * Black Frame Watchdog
 * Detects and recovers from black frames in video streams
 */

class BlackFrameWatchdog {
    constructor(videoElement, options = {}) {
        this.videoElement = videoElement;
        this.options = {
            checkInterval: options.checkInterval || 1000, // Check every second
            blackThreshold: options.blackThreshold || 10, // Brightness threshold
            maxBlackFrames: options.maxBlackFrames || 3, // Max consecutive black frames
            recoveryDelay: options.recoveryDelay || 2000, // Recovery delay in ms
            ...options
        };
        
        this.canvas = null;
        this.context = null;
        this.isMonitoring = false;
        this.blackFrameCount = 0;
        this.lastFrameTime = 0;
        this.recoveryCallbacks = new Set();
        
        this.initializeCanvas();
    }
    
    initializeCanvas() {
        // Create off-screen canvas for frame analysis
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
        
        // Set canvas size to match video (will be updated when video loads)
        this.canvas.width = 320;
        this.canvas.height = 240;
        
        console.log('✅ Black frame watchdog canvas initialized');
    }
    
    startMonitoring() {
        if (this.isMonitoring) {
            console.log('⚠️ Watchdog already monitoring');
            return;
        }
        
        if (!this.videoElement) {
            console.error('❌ No video element provided for monitoring');
            return;
        }
        
        this.isMonitoring = true;
        this.blackFrameCount = 0;
        this.lastFrameTime = Date.now();
        
        console.log('🐕 Black frame watchdog started monitoring');
        this.monitorLoop();
    }
    
    stopMonitoring() {
        this.isMonitoring = false;
        console.log('🛑 Black frame watchdog stopped monitoring');
    }
    
    async monitorLoop() {
        while (this.isMonitoring) {
            try {
                await this.checkFrame();
                await new Promise(resolve => setTimeout(resolve, this.options.checkInterval));
            } catch (error) {
                console.error('Watchdog monitoring error:', error);
                await new Promise(resolve => setTimeout(resolve, this.options.checkInterval));
            }
        }
    }
    
    async checkFrame() {
        if (!this.videoElement || this.videoElement.readyState < 2) {
            // Video not ready
            return;
        }
        
        // Update canvas size to match video
        if (this.canvas.width !== this.videoElement.videoWidth || 
            this.canvas.height !== this.videoElement.videoHeight) {
            this.canvas.width = this.videoElement.videoWidth || 320;
            this.canvas.height = this.videoElement.videoHeight || 240;
        }
        
        // Draw current video frame to canvas
        this.context.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
        
        // Get image data for analysis
        const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const brightness = this.calculateBrightness(imageData);
        
        // Check if frame is black
        const isBlackFrame = brightness < this.options.blackThreshold;
        
        if (isBlackFrame) {
            this.blackFrameCount++;
            console.log(`⚫ Black frame detected (count: ${this.blackFrameCount}, brightness: ${brightness.toFixed(2)})`);
            
            if (this.blackFrameCount >= this.options.maxBlackFrames) {
                console.log('🚨 Multiple black frames detected, initiating recovery');
                await this.initiateRecovery();
            }
        } else {
            // Reset count on good frame
            if (this.blackFrameCount > 0) {
                console.log(`✅ Good frame detected, resetting black frame count (brightness: ${brightness.toFixed(2)})`);
                this.blackFrameCount = 0;
            }
        }
        
        this.lastFrameTime = Date.now();
    }
    
    calculateBrightness(imageData) {
        const data = imageData.data;
        let totalBrightness = 0;
        let pixelCount = 0;
        
        // Sample every 4th pixel for performance
        for (let i = 0; i < data.length; i += 16) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Calculate perceived brightness
            const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
            totalBrightness += brightness;
            pixelCount++;
        }
        
        return pixelCount > 0 ? totalBrightness / pixelCount : 0;
    }
    
    async initiateRecovery() {
        console.log('🔧 Initiating black frame recovery...');
        
        const recoveryStartTime = Date.now();
        
        try {
            // Notify recovery callbacks
            this.notifyRecoveryStart();
            
            // Wait for recovery delay
            await new Promise(resolve => setTimeout(resolve, this.options.recoveryDelay));
            
            // Attempt to restart video stream
            if (this.videoElement && this.videoElement.srcObject) {
                const stream = this.videoElement.srcObject;
                
                // Stop and restart tracks
                stream.getTracks().forEach(track => {
                    track.stop();
                });
                
                // Request new stream
                try {
                    const newStream = await navigator.mediaDevices.getUserMedia({
                        video: { width: 1280, height: 720 },
                        audio: false
                    });
                    
                    this.videoElement.srcObject = newStream;
                    
                    const recoveryTime = Date.now() - recoveryStartTime;
                    console.log(`✅ Black frame recovery completed in ${recoveryTime}ms`);
                    
                    // Log success for validation
                    if (recoveryTime < 2000) {
                        console.log('Preview resumes in under 2s');
                    }
                    
                    this.notifyRecoverySuccess(recoveryTime);
                    
                } catch (streamError) {
                    console.error('❌ Failed to get new stream during recovery:', streamError);
                    this.notifyRecoveryFailure(streamError);
                }
            }
            
            // Reset black frame count
            this.blackFrameCount = 0;
            
        } catch (error) {
            console.error('❌ Black frame recovery failed:', error);
            this.notifyRecoveryFailure(error);
        }
    }
    
    notifyRecoveryStart() {
        const event = {
            type: 'recovery_start',
            timestamp: new Date().toISOString(),
            blackFrameCount: this.blackFrameCount
        };
        
        this.recoveryCallbacks.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                console.error('Recovery callback error:', error);
            }
        });
    }
    
    notifyRecoverySuccess(recoveryTime) {
        const event = {
            type: 'recovery_success',
            timestamp: new Date().toISOString(),
            recoveryTime: recoveryTime
        };
        
        this.recoveryCallbacks.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                console.error('Recovery callback error:', error);
            }
        });
    }
    
    notifyRecoveryFailure(error) {
        const event = {
            type: 'recovery_failure',
            timestamp: new Date().toISOString(),
            error: error.message || error
        };
        
        this.recoveryCallbacks.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                console.error('Recovery callback error:', error);
            }
        });
    }
    
    addRecoveryCallback(callback) {
        this.recoveryCallbacks.add(callback);
        console.log('Recovery callback registered');
    }
    
    removeRecoveryCallback(callback) {
        this.recoveryCallbacks.delete(callback);
        console.log('Recovery callback unregistered');
    }
    
    getStatus() {
        return {
            isMonitoring: this.isMonitoring,
            blackFrameCount: this.blackFrameCount,
            lastFrameTime: this.lastFrameTime,
            timeSinceLastFrame: Date.now() - this.lastFrameTime
        };
    }
    
    cleanup() {
        this.stopMonitoring();
        this.recoveryCallbacks.clear();
        
        if (this.canvas) {
            this.canvas = null;
            this.context = null;
        }
        
        console.log('Black frame watchdog cleaned up');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BlackFrameWatchdog;
} else {
    window.BlackFrameWatchdog = BlackFrameWatchdog;
}