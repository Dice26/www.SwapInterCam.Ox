/**
 * Device Hot-Swap Manager
 * Handles camera device changes during runtime
 */

class DeviceHotSwapManager {
    constructor() {
        this.activeDevices = new Map();
        this.deviceChangeCallbacks = new Set();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.reconnectDelay = 1000; // Start with 1 second
        
        this.initializeDeviceMonitoring();
    }
    
    async initializeDeviceMonitoring() {
        try {
            // Get initial device list
            await this.updateDeviceList();
            
            // Set up device change monitoring
            if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
                navigator.mediaDevices.addEventListener('devicechange', 
                    this.handleDeviceChange.bind(this));
                console.log('✅ Device monitoring initialized');
            }
            
        } catch (error) {
            console.error('Device monitoring initialization failed:', error);
        }
    }
    
    async updateDeviceList() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            // Update active devices map
            this.activeDevices.clear();
            videoDevices.forEach(device => {
                this.activeDevices.set(device.deviceId, {
                    id: device.deviceId,
                    label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
                    kind: device.kind,
                    available: true
                });
            });
            
            console.log(`📹 Found ${videoDevices.length} video devices`);
            return videoDevices;
            
        } catch (error) {
            console.error('Failed to enumerate devices:', error);
            return [];
        }
    }
    
    async handleDeviceChange() {
        console.log('🔄 Device change detected, updating device list...');
        
        try {
            const previousDeviceCount = this.activeDevices.size;
            await this.updateDeviceList();
            const currentDeviceCount = this.activeDevices.size;
            
            // Determine change type
            let changeType = 'unknown';
            if (currentDeviceCount > previousDeviceCount) {
                changeType = 'device_added';
            } else if (currentDeviceCount < previousDeviceCount) {
                changeType = 'device_removed';
            } else {
                changeType = 'device_changed';
            }
            
            // Notify all registered callbacks
            this.notifyDeviceChange(changeType);
            
            // Attempt to recover active streams
            await this.attemptStreamRecovery();
            
        } catch (error) {
            console.error('Device change handling failed:', error);
        }
    }
    
    notifyDeviceChange(changeType) {
        const deviceInfo = {
            type: changeType,
            devices: Array.from(this.activeDevices.values()),
            timestamp: new Date().toISOString()
        };
        
        this.deviceChangeCallbacks.forEach(callback => {
            try {
                callback(deviceInfo);
            } catch (error) {
                console.error('Device change callback failed:', error);
            }
        });
    }
    
    async attemptStreamRecovery() {
        console.log('🔧 Attempting stream recovery...');
        
        const startTime = Date.now();
        let recovered = false;
        
        for (let attempt = 1; attempt <= this.maxReconnectAttempts; attempt++) {
            try {
                console.log(`Reconnection attempt ${attempt}/${this.maxReconnectAttempts}`);
                
                // Try to get a new stream
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 1280, height: 720 },
                    audio: false
                });
                
                if (stream) {
                    const recoveryTime = Date.now() - startTime;
                    console.log(`✅ Stream recovered in ${recoveryTime}ms`);
                    
                    // Notify recovery success
                    this.notifyStreamRecovery(stream, recoveryTime);
                    recovered = true;
                    break;
                }
                
            } catch (error) {
                console.warn(`Reconnection attempt ${attempt} failed:, error.message`);
                
                if (attempt < this.maxReconnectAttempts) {
                    await new Promise(resolve => 
                        setTimeout(resolve, this.reconnectDelay * attempt));
                }
            }
        }
        
        if (!recovered) {
            const totalTime = Date.now() - startTime;
            console.error(`❌ Stream recovery failed after ${totalTime}ms`);
            this.notifyStreamRecoveryFailed(totalTime);
        }
        
        return recovered;
    }
    
    notifyStreamRecovery(stream, recoveryTime) {
        const recoveryInfo = {
            type: 'stream_recovered',
            stream: stream,
            recoveryTime: recoveryTime,
            timestamp: new Date().toISOString()
        };
        
        this.deviceChangeCallbacks.forEach(callback => {
            try {
                callback(recoveryInfo);
            } catch (error) {
                console.error('Stream recovery callback failed:', error);
            }
        });
    }
    
    notifyStreamRecoveryFailed(totalTime) {
        const failureInfo = {
            type: 'stream_recovery_failed',
            totalTime: totalTime,
            timestamp: new Date().toISOString()
        };
        
        this.deviceChangeCallbacks.forEach(callback => {
            try {
                callback(failureInfo);
            } catch (error) {
                console.error('Stream recovery failure callback failed:', error);
            }
        });
    }
    
    registerDeviceChangeCallback(callback) {
        this.deviceChangeCallbacks.add(callback);
        console.log('Device change callback registered');
    }
    
    unregisterDeviceChangeCallback(callback) {
        this.deviceChangeCallbacks.delete(callback);
        console.log('Device change callback unregistered');
    }
    
    getAvailableDevices() {
        return Array.from(this.activeDevices.values());
    }
    
    cleanup() {
        if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
            navigator.mediaDevices.removeEventListener('devicechange', 
                this.handleDeviceChange.bind(this));
        }
        
        this.deviceChangeCallbacks.clear();
        this.activeDevices.clear();
        console.log('Device hot-swap manager cleaned up');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeviceHotSwapManager;
} else {
    window.DeviceHotSwapManager = DeviceHotSwapManager;
}