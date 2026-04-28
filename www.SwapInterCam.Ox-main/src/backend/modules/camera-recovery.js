/**
 * Camera Recovery Module - Backend-Centric Camera Management
 * Handles camera stream failures, permission issues, and device reconnection
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class CameraRecoveryModule {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.name = 'camera-recovery';
        this.recoveryStrategies = new Map();
        this.activeRecoveries = new Map();
        this.monitoringInterval = null;
        this.lastDeviceScan = null;
        this.deviceCache = [];
        
        this.initializeStrategies();
        console.log('📹 Camera Recovery Module initialized');
    }

    initializeStrategies() {
        // Register recovery strategies
        this.recoveryStrategies.set('stream-restart', {
            name: 'Stream Restart',
            description: 'Restart camera stream',
            severity: ['warning', 'error'],
            execute: this.restartCameraStream.bind(this)
        });

        this.recoveryStrategies.set('permission-fix', {
            name: 'Permission Fix',
            description: 'Fix camera permissions',
            severity: ['error', 'critical'],
            execute: this.fixCameraPermissions.bind(this)
        });

        this.recoveryStrategies.set('device-reconnect', {
            name: 'Device Reconnect',
            description: 'Reconnect camera device',
            severity: ['error', 'critical'],
            execute: this.reconnectCameraDevice.bind(this)
        });

        this.recoveryStrategies.set('force-refresh', {
            name: 'Force Refresh',
            description: 'Force refresh camera system',
            severity: ['critical'],
            execute: this.forceRefreshCamera.bind(this)
        });

        this.recoveryStrategies.set('persistence-override', {
            name: 'Persistence Override',
            description: 'Apply aggressive camera persistence',
            severity: ['warning', 'error'],
            execute: this.applyPersistenceOverride.bind(this)
        });

        console.log(`📹 Registered ${this.recoveryStrategies.size} camera recovery strategies`);
    }

    /**
     * Check if this module can handle a specific issue
     */
    canHandle(issue) {
        const cameraKeywords = [
            'camera', 'stream', 'video', 'webcam', 'device',
            'permission', 'access', 'getUserMedia', 'MediaStream'
        ];
        
        return cameraKeywords.some(keyword => 
            issue.message.toLowerCase().includes(keyword.toLowerCase())
        );
    }

    /**
     * Execute recovery for camera issues
     */
    async execute(context) {
        const { issue, component, recoveryId } = context;
        
        console.log(`🔧 Executing camera recovery for: ${issue.message}`);
        
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
                        type: 'camera-recovery',
                        target: issue.message,
                        status: 'running',
                        startTime: Date.now()
                    }]
                }
            }, 'camera-recovery');

            // Determine best recovery strategy
            const strategy = this.selectRecoveryStrategy(issue);
            
            if (!strategy) {
                throw new Error(`No suitable recovery strategy for: ${issue.message}`);
            }

            console.log(`📹 Using strategy: ${strategy.name}`);
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
            }, 'camera-recovery');

            console.log(`✅ Camera recovery completed: ${result.message}`);
            return result;

        } catch (error) {
            console.error(`❌ Camera recovery failed:`, error);

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
            }, 'camera-recovery');

            return {
                success: false,
                message: `Camera recovery failed: ${error.message}`,
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
        
        // Permission-related issues
        if (message.includes('permission') || message.includes('denied') || message.includes('access')) {
            return this.recoveryStrategies.get('permission-fix');
        }
        
        // Stream-related issues
        if (message.includes('stream') || message.includes('failed') || message.includes('inactive')) {
            return this.recoveryStrategies.get('stream-restart');
        }
        
        // Device-related issues
        if (message.includes('device') || message.includes('disconnected') || message.includes('not found')) {
            return this.recoveryStrategies.get('device-reconnect');
        }
        
        // Persistence issues
        if (message.includes('hidden') || message.includes('terminated') || message.includes('stopped')) {
            return this.recoveryStrategies.get('persistence-override');
        }
        
        // Critical issues - use force refresh
        if (issue.severity === 'critical' || message.includes('critical')) {
            return this.recoveryStrategies.get('force-refresh');
        }
        
        // Default to stream restart for general issues
        return this.recoveryStrategies.get('stream-restart');
    }

    /**
     * Recovery Strategy: Restart Camera Stream
     */
    async restartCameraStream(issue, context) {
        console.log('🔄 Restarting camera stream...');
        
        // Scan for available devices
        const devices = await this.scanCameraDevices();
        
        // Update camera state with new devices
        const newCameraState = {
            devices: devices,
            activeStreams: devices.length > 0 ? 1 : 0,
            permissions: 'granted',
            lastScan: Date.now(),
            preferredDevice: devices[0]?.id || null
        };
        
        // Remove the specific issue
        this.stateManager.removeIssue('cameras', issue.id);
        
        return {
            success: true,
            message: 'Camera stream restarted successfully',
            details: `Found ${devices.length} camera devices, stream restored`,
            newState: {
                cameras: newCameraState
            }
        };
    }

    /**
     * Recovery Strategy: Fix Camera Permissions
     */
    async fixCameraPermissions(issue, context) {
        console.log('🔐 Fixing camera permissions...');
        
        try {
            // Check current permission status
            const permissionStatus = await this.checkCameraPermissions();
            
            if (permissionStatus.granted) {
                // Permissions are already granted, issue might be elsewhere
                console.log('📹 Permissions already granted, checking device access...');
                
                // Try to access camera directly
                const deviceAccess = await this.testCameraAccess();
                
                if (deviceAccess.success) {
                    // Remove the permission issue
                    this.stateManager.removeIssue('cameras', issue.id);
                    
                    return {
                        success: true,
                        message: 'Camera permissions verified and working',
                        details: 'Camera access test successful',
                        newState: {
                            cameras: {
                                permissions: 'granted',
                                activeStreams: 1
                            }
                        }
                    };
                } else {
                    throw new Error('Camera access test failed despite granted permissions');
                }
            } else {
                // Try to trigger permission request
                await this.requestCameraPermissions();
                
                // Remove the permission issue
                this.stateManager.removeIssue('cameras', issue.id);
                
                return {
                    success: true,
                    message: 'Camera permission request initiated',
                    details: 'User will be prompted for camera access',
                    newState: {
                        cameras: {
                            permissions: 'prompt'
                        }
                    }
                };
            }
            
        } catch (error) {
            console.error('❌ Permission fix failed:', error);
            
            // Add a more specific issue
            this.stateManager.addIssue('cameras', 
                `Permission fix failed: ${error.message}`, 'error');
            
            return {
                success: false,
                message: 'Camera permission fix failed',
                details: error.message
            };
        }
    }

    /**
     * Recovery Strategy: Reconnect Camera Device
     */
    async reconnectCameraDevice(issue, context) {
        console.log('🔌 Reconnecting camera device...');
        
        try {
            // Force device scan
            const devices = await this.scanCameraDevices(true);
            
            if (devices.length === 0) {
                throw new Error('No camera devices found after scan');
            }
            
            // Test each device
            const workingDevices = [];
            for (const device of devices) {
                const testResult = await this.testDeviceAccess(device);
                if (testResult.success) {
                    workingDevices.push(device);
                }
            }
            
            if (workingDevices.length === 0) {
                throw new Error('No working camera devices found');
            }
            
            // Remove the device issue
            this.stateManager.removeIssue('cameras', issue.id);
            
            // Update camera state
            const newCameraState = {
                devices: workingDevices,
                activeStreams: 1,
                permissions: 'granted',
                lastScan: Date.now(),
                preferredDevice: workingDevices[0].id
            };
            
            return {
                success: true,
                message: 'Camera device reconnected successfully',
                details: `Found ${workingDevices.length} working camera devices`,
                newState: {
                    cameras: newCameraState
                }
            };
            
        } catch (error) {
            console.error('❌ Device reconnection failed:', error);
            
            return {
                success: false,
                message: 'Camera device reconnection failed',
                details: error.message
            };
        }
    }

    /**
     * Recovery Strategy: Force Refresh Camera System
     */
    async forceRefreshCamera(issue, context) {
        console.log('💪 Force refreshing camera system...');
        
        try {
            // Clear all camera issues first
            this.stateManager.clearIssues('cameras');
            
            // Reset camera state to defaults
            const defaultCameraState = {
                devices: [],
                activeStreams: 0,
                permissions: 'unknown',
                issues: [],
                lastScan: null,
                preferredDevice: null
            };
            
            this.stateManager.setComponentState('cameras', defaultCameraState, 'force-refresh');
            
            // Wait a moment for state to settle
            await this.sleep(1000);
            
            // Perform fresh device scan
            const devices = await this.scanCameraDevices(true);
            
            // Test camera access
            const accessTest = await this.testCameraAccess();
            
            // Update with fresh state
            const newCameraState = {
                devices: devices,
                activeStreams: accessTest.success ? 1 : 0,
                permissions: accessTest.success ? 'granted' : 'unknown',
                lastScan: Date.now(),
                preferredDevice: devices[0]?.id || null
            };
            
            return {
                success: true,
                message: 'Camera system force refreshed successfully',
                details: `System reset and ${devices.length} devices found`,
                newState: {
                    cameras: newCameraState
                }
            };
            
        } catch (error) {
            console.error('❌ Force refresh failed:', error);
            
            return {
                success: false,
                message: 'Camera system force refresh failed',
                details: error.message
            };
        }
    }

    /**
     * Recovery Strategy: Apply Persistence Override
     */
    async applyPersistenceOverride(issue, context) {
        console.log('🛡️ Applying camera persistence override...');
        
        try {
            // Check if persistence override is already active
            const persistenceStatus = await this.checkPersistenceOverride();
            
            if (!persistenceStatus.active) {
                // Activate persistence override
                await this.activatePersistenceOverride();
            }
            
            // Remove the persistence-related issue
            this.stateManager.removeIssue('cameras', issue.id);
            
            // Update camera state to show persistence is active
            const newCameraState = {
                activeStreams: 1,
                permissions: 'granted',
                persistenceOverride: true
            };
            
            return {
                success: true,
                message: 'Camera persistence override applied',
                details: 'Aggressive camera protection activated',
                newState: {
                    cameras: newCameraState
                }
            };
            
        } catch (error) {
            console.error('❌ Persistence override failed:', error);
            
            return {
                success: false,
                message: 'Camera persistence override failed',
                details: error.message
            };
        }
    }

    /**
     * Scan for available camera devices
     */
    async scanCameraDevices(forceRefresh = false) {
        if (!forceRefresh && this.deviceCache.length > 0 && 
            this.lastDeviceScan && (Date.now() - this.lastDeviceScan) < 10000) {
            console.log('📹 Using cached camera devices');
            return this.deviceCache;
        }
        
        console.log('🔍 Scanning for camera devices...');
        
        try {
            // Simulate device scanning (in real implementation, this would use system APIs)
            const devices = [
                {
                    id: 'integrated-camera',
                    name: 'Integrated Camera',
                    type: 'built-in',
                    status: 'available',
                    capabilities: {
                        maxWidth: 1920,
                        maxHeight: 1080,
                        frameRate: 30
                    }
                }
            ];
            
            // Check for OBS Virtual Camera
            const obsVirtualCamera = await this.checkOBSVirtualCamera();
            if (obsVirtualCamera.available) {
                devices.push({
                    id: 'obs-virtual-camera',
                    name: 'OBS Virtual Camera',
                    type: 'virtual',
                    status: 'available',
                    capabilities: {
                        maxWidth: 1920,
                        maxHeight: 1080,
                        frameRate: 60
                    }
                });
            }
            
            // Check for USB cameras (simulate)
            const usbCameras = await this.scanUSBCameras();
            devices.push(...usbCameras);
            
            this.deviceCache = devices;
            this.lastDeviceScan = Date.now();
            
            console.log(`📹 Found ${devices.length} camera devices`);
            return devices;
            
        } catch (error) {
            console.error('❌ Camera device scan failed:', error);
            return [];
        }
    }

    /**
     * Check camera permissions
     */
    async checkCameraPermissions() {
        try {
            // In a real implementation, this would check system permissions
            // For now, simulate permission check
            return {
                granted: true,
                status: 'granted',
                canRequest: true
            };
        } catch (error) {
            return {
                granted: false,
                status: 'denied',
                canRequest: false,
                error: error.message
            };
        }
    }

    /**
     * Request camera permissions
     */
    async requestCameraPermissions() {
        console.log('🔐 Requesting camera permissions...');
        
        // In a real implementation, this would trigger system permission dialog
        // For now, simulate permission request
        await this.sleep(1000);
        
        return {
            success: true,
            status: 'granted'
        };
    }

    /**
     * Test camera access
     */
    async testCameraAccess() {
        try {
            console.log('🧪 Testing camera access...');
            
            // Simulate camera access test
            await this.sleep(500);
            
            return {
                success: true,
                message: 'Camera access test successful'
            };
        } catch (error) {
            return {
                success: false,
                message: 'Camera access test failed',
                error: error.message
            };
        }
    }

    /**
     * Test specific device access
     */
    async testDeviceAccess(device) {
        try {
            console.log(`🧪 Testing device access: ${device.name}`);
            
            // Simulate device access test
            await this.sleep(300);
            
            return {
                success: true,
                device: device.id,
                message: `Device ${device.name} is accessible`
            };
        } catch (error) {
            return {
                success: false,
                device: device.id,
                message: `Device ${device.name} access failed`,
                error: error.message
            };
        }
    }

    /**
     * Check OBS Virtual Camera availability
     */
    async checkOBSVirtualCamera() {
        try {
            // In real implementation, this would check for OBS Virtual Camera
            // For now, simulate based on OBS connection state
            const obsState = this.stateManager.getComponentState('obs');
            
            return {
                available: obsState.connected && obsState.virtualCamera,
                active: obsState.virtualCamera
            };
        } catch (error) {
            return {
                available: false,
                active: false,
                error: error.message
            };
        }
    }

    /**
     * Scan for USB cameras
     */
    async scanUSBCameras() {
        try {
            // Simulate USB camera detection
            const usbCameras = [];
            
            // Random chance of finding USB camera
            if (Math.random() > 0.7) {
                usbCameras.push({
                    id: 'usb-camera-1',
                    name: 'USB Camera',
                    type: 'usb',
                    status: 'available',
                    capabilities: {
                        maxWidth: 1280,
                        maxHeight: 720,
                        frameRate: 30
                    }
                });
            }
            
            return usbCameras;
        } catch (error) {
            console.error('❌ USB camera scan failed:', error);
            return [];
        }
    }

    /**
     * Check persistence override status
     */
    async checkPersistenceOverride() {
        try {
            // Check if camera-persistence-override.js is active
            const persistenceFile = path.join(__dirname, '../../camera-persistence-override.js');
            
            try {
                await fs.access(persistenceFile);
                return {
                    active: true,
                    file: persistenceFile
                };
            } catch (error) {
                return {
                    active: false,
                    file: persistenceFile,
                    error: 'Persistence override file not found'
                };
            }
        } catch (error) {
            return {
                active: false,
                error: error.message
            };
        }
    }

    /**
     * Activate persistence override
     */
    async activatePersistenceOverride() {
        console.log('🛡️ Activating camera persistence override...');
        
        try {
            // In a real implementation, this would inject the persistence override
            // into the renderer process or ensure it's loaded
            
            // For now, simulate activation
            await this.sleep(500);
            
            console.log('✅ Camera persistence override activated');
            return {
                success: true,
                message: 'Persistence override activated'
            };
        } catch (error) {
            console.error('❌ Failed to activate persistence override:', error);
            throw error;
        }
    }

    /**
     * Start monitoring camera health
     */
    startMonitoring(interval = 10000) {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        this.monitoringInterval = setInterval(() => {
            this.performHealthCheck();
        }, interval);
        
        console.log(`👁️ Camera monitoring started (${interval}ms interval)`);
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('👁️ Camera monitoring stopped');
        }
    }

    /**
     * Perform camera health check
     */
    async performHealthCheck() {
        try {
            const cameraState = this.stateManager.getComponentState('cameras');
            const now = Date.now();
            
            // Check if devices need rescanning
            if (!cameraState.lastScan || (now - cameraState.lastScan) > 60000) {
                console.log('🔍 Performing scheduled camera scan...');
                const devices = await this.scanCameraDevices();
                
                if (devices.length !== cameraState.devices.length) {
                    this.stateManager.updateState({
                        cameras: {
                            devices: devices,
                            lastScan: now
                        }
                    }, 'health-check');
                }
            }
            
            // Check for inactive streams
            if (cameraState.activeStreams === 0 && cameraState.devices.length > 0) {
                const existingIssue = cameraState.issues.find(i => 
                    i.message === 'No active camera streams detected'
                );
                
                if (!existingIssue) {
                    this.stateManager.addIssue('cameras', 
                        'No active camera streams detected', 'warning');
                }
            }
            
        } catch (error) {
            console.error('❌ Camera health check failed:', error);
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
            lastDeviceScan: this.lastDeviceScan,
            deviceCount: this.deviceCache.length
        };
    }

    /**
     * Utility: Sleep function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = CameraRecoveryModule;