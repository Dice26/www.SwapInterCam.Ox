/**
 * Camera Preview Component - Fixed Version
 * Handles camera video stream with proper error handling
 */

class CameraPreview {
    constructor() {
        this.videoElement = null;
        this.stream = null;
        this.isActive = false;
        this.constraints = {
            video: {
                width: { ideal: 1920, max: 1920 },
                height: { ideal: 1080, max: 1080 },
                frameRate: { ideal: 30, max: 60 }
            },
            audio: false
        };
    }

    async initialize() {
        console.log('🎥 Initializing Camera Preview...');
        
        try {
            this.videoElement = document.getElementById('camera-preview');
            
            if (!this.videoElement) {
                throw new Error('Camera preview element not found');
            }

            // Setup video element properties
            this.videoElement.autoplay = true;
            this.videoElement.muted = true;
            this.videoElement.playsInline = true;
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Start camera automatically
            await this.startCamera();
            
            console.log('✅ Camera Preview initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize camera preview:', error);
            this.showError('Failed to initialize camera: ' + error.message);
        }
    }

    setupEventListeners() {
        if (!this.videoElement) return;

        this.videoElement.addEventListener('loadedmetadata', () => {
            console.log('📹 Video metadata loaded');
            this.updatePreviewStatus('Camera Active');
        });

        this.videoElement.addEventListener('error', (e) => {
            console.error('📹 Video element error:', e);
            this.showError('Video playback error');
        });

        // Setup control buttons
        const toggleBtn = document.getElementById('toggle-preview');
        const fullscreenBtn = document.getElementById('fullscreen-preview');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleCamera());
        }

        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }
    }

    async startCamera() {
        try {
            console.log('🎥 Starting camera...');
            this.updatePreviewStatus('Connecting to camera...');

            // Check if camera is available
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            if (videoDevices.length === 0) {
                throw new Error('No camera devices found');
            }

            // Get user media
            this.stream = await navigator.mediaDevices.getUserMedia(this.constraints);
            
            if (this.videoElement) {
                this.videoElement.srcObject = this.stream;
                this.isActive = true;
                this.updatePreviewStatus('Camera Active');
                console.log('✅ Camera started successfully');
            }

        } catch (error) {
            console.error('❌ Failed to start camera:', error);
            this.isActive = false;
            
            let errorMessage = 'Failed to access camera';
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Camera access denied. Please allow camera permissions.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No camera found. Please connect a camera.';
            } else if (error.name === 'NotReadableError') {
                errorMessage = 'Camera is being used by another application.';
            }
            
            this.showError(errorMessage);
        }
    }

    stopCamera() {
        console.log('🛑 Stopping camera...');
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                track.stop();
                console.log('🔌 Stopped track:', track.kind);
            });
            this.stream = null;
        }

        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }

        this.isActive = false;
        this.updatePreviewStatus('Camera Stopped');
        console.log('✅ Camera stopped');
    }

    async toggleCamera() {
        if (this.isActive) {
            this.stopCamera();
        } else {
            await this.startCamera();
        }
    }

    toggleFullscreen() {
        if (!this.videoElement) return;

        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            this.videoElement.requestFullscreen().catch(err => {
                console.error('Failed to enter fullscreen:', err);
            });
        }
    }

    updatePreviewStatus(status) {
        const statusElement = document.getElementById('preview-status');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    showError(message) {
        this.updatePreviewStatus('Error: ' + message);
        
        // Show error in UI
        const errorDiv = document.createElement('div');
        errorDiv.className = 'camera-error';
        errorDiv.textContent = message;
        
        const container = document.querySelector('.camera-preview-container');
        if (container) {
            const existingError = container.querySelector('.camera-error');
            if (existingError) {
                existingError.remove();
            }
            container.appendChild(errorDiv);
        }
    }

    getStatus() {
        return {
            isActive: this.isActive,
            hasStream: !!this.stream,
            videoElement: !!this.videoElement
        };
    }
}

// Initialize camera preview when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.cameraPreview = new CameraPreview();
    window.cameraPreview.initialize();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CameraPreview;
}