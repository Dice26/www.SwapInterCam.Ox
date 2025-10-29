/**
 * Camera Preview Fixed Component
 * Enhanced with hot-swap capability and error handling
 */

class CameraPreviewFixed {
    constructor(container, options = {}) {
        this.container = container;
        this.options = options;
        this.initialized = false;
        this.stream = null;
        this.video = null;
        this.videoElement = null;
        this.isActive = false;
        this.deviceChangeHandler = null;
    }

    async initialize() {
        console.log('Camera Preview Fixed initialized');
        this.createPreview();
        this.setupControls();
        this.prepareForHotSwap();
    }

    createPreview() {
        const container = document.createElement('div');
        container.id = 'camera-preview-fixed';
        
        const video = document.createElement('video');
        video.id = 'preview-video-fixed';
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        
        container.appendChild(video);
        document.body.appendChild(container);
        
        this.videoElement = video;
        this.video = video;
    }

    setupControls() {
        const controls = document.createElement('div');
        controls.innerHTML = '<button onclick="cameraPreviewFixed.toggle()">Toggle Camera</button>';
        document.body.appendChild(controls);
    }

    async start() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 }
            });
            
            if (this.videoElement) {
                this.videoElement.srcObject = this.stream;
                this.isActive = true;
            }
        } catch (error) {
            console.error('Failed to start camera:', error);
            this.handleCameraError(error);
        }
    }

    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.isActive = false;
        }
    }

    toggle() {
        if (this.isActive) {
            this.stop();
        } else {
            this.start();
        }
    }

    async initializeCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 },
                audio: false
            });
            
            if (this.video) {
                this.video.srcObject = this.stream;
                this.initialized = true;
                console.log('Camera preview initialized successfully');
                return true;
            }
        } catch (error) {
            console.error('Camera initialization failed:', error);
            this.handleCameraError(error);
            return false;
        }
    }
    
    handleCameraError(error) {
        const errorMessage = error.name === 'NotAllowedError' 
            ? 'Camera access denied by user'
            : 'Camera initialization failed: ' + error.message;
        
        console.error('Camera Error:', errorMessage);
        if (this.container) {
            this.container.innerHTML = `<div class="camera-error">${errorMessage}</div>`;
        }
    }

    prepareForHotSwap() {
        // Prepare for device switching
        this.deviceChangeHandler = () => {
            console.log('Camera device change detected');
            this.reinitializeCamera();
        };
        
        if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
            navigator.mediaDevices.addEventListener('devicechange', this.deviceChangeHandler);
        }
    }
    
    async reinitializeCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        
        // Wait brief moment for device to stabilize
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return this.initializeCamera();
    }
    
    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        if (this.deviceChangeHandler && navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
            navigator.mediaDevices.removeEventListener('devicechange', this.deviceChangeHandler);
        }
        
        this.initialized = false;
        console.log('Camera preview cleaned up');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CameraPreviewFixed;
} else if (typeof window !== 'undefined') {
    window.CameraPreviewFixed = CameraPreviewFixed;
    window.cameraPreviewFixed = new CameraPreviewFixed();
}
    // Hot-swap integration
    initializeHotSwap() {
        if (typeof DeviceHotSwapManager !== 'undefined') {
            this.hotSwapManager = new DeviceHotSwapManager();
            
            this.hotSwapManager.registerDeviceChangeCallback((info) => {
                console.log('Device change event:', info.type);
                
                if (info.type === 'stream_recovered') {
                    this.handleStreamRecovery(info.stream, info.recoveryTime);
                } else if (info.type === 'stream_recovery_failed') {
                    this.handleStreamRecoveryFailure(info.totalTime);
                }
            });
            
            console.log('✅ Hot-swap integration initialized');
        }
    }
    
    handleStreamRecovery(stream, recoveryTime) {
        if (this.video && stream) {
            this.video.srcObject = stream;
            this.stream = stream;
            
            console.log(`✅ Preview resumes in ${recoveryTime}ms`);
            
            // Log success for validation
            if (recoveryTime < 2000) {
                console.log('Preview resumes in under 2s');
            }
        }
    }
    
    handleStreamRecoveryFailure(totalTime) {
        console.error(`❌ Stream recovery failed after ${totalTime}ms`);
        
        if (this.container) {
            this.container.innerHTML = `
                <div class="camera-error">
                    Camera connection lost. Please check your device and refresh.
                    <button onclick="location.reload()">Refresh</button>
                </div>
            `;
        }
    }