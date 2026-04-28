// Camera Controls UI - Professional camera adjustment interface with real-time preview

class CameraControlsUI {
    constructor() {
        this.isInitialized = false;
        this.isVisible = false;
        this.previewActive = false;
        this.previewStream = null;
        this.previewCanvas = null;
        this.previewContext = null;
        this.animationFrame = null;
        
        // Camera settings
        this.settings = {
            sharpness: 50,
            brightness: 50,
            contrast: 50,
            saturation: 50,
            colorCorrection: false,
            selectedScene: 'auto',
            resolution: '1920x1080',
            fps: 30
        };
        
        // Camera devices
        this.cameras = [];
        this.selectedCamera = null;
        this.obsConnected = false;
        
        this.initialize();
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            console.log('Initializing Camera Controls UI...');
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load saved settings
            await this.loadSettings();
            
            // Initialize camera detection
            await this.detectCameras();
            
            // Setup real-time updates
            this.setupRealTimeUpdates();
            
            this.isInitialized = true;
            console.log('Camera Controls UI initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Camera Controls UI:', error);
            this.showError('Failed to initialize camera controls');
        }
    }

    setupEventListeners() {
        // Toggle camera controls visibility
        const toggleButton = document.getElementById('camera-controls-toggle');
        if (toggleButton) {
            toggleButton.addEventListener('click', () => this.toggle());
        }

        // Close button
        const closeButton = document.getElementById('camera-controls-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.hide());
        }

        // Camera preview toggle
        const previewButton = document.getElementById('show-camera-preview');
        if (previewButton) {
            previewButton.addEventListener('click', () => this.togglePreview());
        }

        // Adjustment sliders
        this.setupSliderListeners();
        
        // Scene selection
        const sceneSelect = document.getElementById('scene-select');
        if (sceneSelect) {
            sceneSelect.addEventListener('change', (e) => this.changeScene(e.target.value));
        }

        // Control buttons
        const refreshButton = document.getElementById('camera-refresh');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => this.refreshCameras());
        }

        const obsReconnectButton = document.getElementById('obs-reconnect');
        if (obsReconnectButton) {
            obsReconnectButton.addEventListener('click', () => this.reconnectOBS());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    setupSliderListeners() {
        const sliders = [
            { id: 'sharpness-slider', setting: 'sharpness', valueId: 'sharpness-value' },
            { id: 'brightness-slider', setting: 'brightness', valueId: 'brightness-value' },
            { id: 'contrast-slider', setting: 'contrast', valueId: 'contrast-value' },
            { id: 'saturation-slider', setting: 'saturation', valueId: 'saturation-value' }
        ];

        sliders.forEach(({ id, setting, valueId }) => {
            const slider = document.getElementById(id);
            const valueDisplay = document.getElementById(valueId);
            
            if (slider && valueDisplay) {
                // Set initial value
                slider.value = this.settings[setting];
                valueDisplay.textContent = `${this.settings[setting]}%`;
                
                // Real-time updates
                slider.addEventListener('input', (e) => {
                    const value = parseInt(e.target.value);
                    this.settings[setting] = value;
                    valueDisplay.textContent = `${value}%`;
                    this.applySettingsRealTime();
                });

                // Save on change
                slider.addEventListener('change', () => {
                    this.saveSettings();
                });
            }
        });

        // Color correction checkbox
        const colorCorrectionCheckbox = document.getElementById('color-correction');
        if (colorCorrectionCheckbox) {
            colorCorrectionCheckbox.checked = this.settings.colorCorrection;
            colorCorrectionCheckbox.addEventListener('change', (e) => {
                this.settings.colorCorrection = e.target.checked;
                this.applySettingsRealTime();
                this.saveSettings();
            });
        }
    }

    setupRealTimeUpdates() {
        // Update status every 2 seconds
        setInterval(() => {
            this.updateStatus();
        }, 2000);

        // Update preview if active
        if (this.previewActive) {
            this.updatePreview();
        }
    }

    async detectCameras() {
        try {
            const result = await window.electronAPI.camera.getDevices();
            
            if (result.success) {
                this.cameras = result.cameras || [];
                this.selectedCamera = result.obsVirtualCamera || result.cameras[0];
                
                console.log('Detected cameras:', this.cameras.length);
                this.updateCameraStatus();
            } else {
                console.warn('Failed to detect cameras:', result.error);
            }
        } catch (error) {
            console.error('Camera detection error:', error);
        }
    }

    async togglePreview() {
        if (this.previewActive) {
            this.stopPreview();
        } else {
            await this.startPreview();
        }
    }

    async startPreview() {
        try {
            console.log('Starting camera preview...');
            
            // Create preview container if it doesn't exist
            this.createPreviewContainer();
            
            // Request camera access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30 }
                }
            });

            this.previewStream = stream;
            
            // Setup canvas for real-time effects
            this.setupPreviewCanvas(stream);
            
            // Update UI
            const previewButton = document.getElementById('show-camera-preview');
            if (previewButton) {
                previewButton.textContent = '⏹️ Stop Preview';
                previewButton.classList.add('active');
            }
            
            this.previewActive = true;
            this.updatePreview();
            
            console.log('Camera preview started successfully');
        } catch (error) {
            console.error('Failed to start camera preview:', error);
            this.showError('Failed to access camera. Please check permissions.');
        }
    }

    stopPreview() {
        console.log('Stopping camera preview...');
        
        if (this.previewStream) {
            this.previewStream.getTracks().forEach(track => track.stop());
            this.previewStream = null;
        }

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        // Update UI
        const previewButton = document.getElementById('show-camera-preview');
        if (previewButton) {
            previewButton.textContent = '🎥 Show Preview';
            previewButton.classList.remove('active');
        }

        // Hide preview container
        const previewContainer = document.getElementById('camera-preview-container');
        if (previewContainer) {
            previewContainer.style.display = 'none';
        }

        this.previewActive = false;
        console.log('Camera preview stopped');
    }

    createPreviewContainer() {
        let previewContainer = document.getElementById('camera-preview-container');
        
        if (!previewContainer) {
            previewContainer = document.createElement('div');
            previewContainer.id = 'camera-preview-container';
            previewContainer.className = 'preview-container';
            previewContainer.innerHTML = `
                <div class="preview-header">
                    <h4>📹 Camera Preview</h4>
                    <div class="preview-controls">
                        <button id="preview-fullscreen" class="preview-control-btn" title="Fullscreen">⛶</button>
                        <button id="preview-close" class="preview-control-btn" title="Close">✕</button>
                    </div>
                </div>
                <div class="preview-content">
                    <canvas id="camera-preview-canvas"></canvas>
                    <div class="preview-overlay">
                        <div class="recording-indicator hidden" id="recording-indicator">
                            <div class="recording-dot"></div>
                            <span>LIVE</span>
                        </div>
                    </div>
                </div>
                <div class="preview-footer">
                    <div class="preview-stats">
                        <span id="preview-fps">30 FPS</span>
                        <span id="preview-resolution">640x480</span>
                    </div>
                </div>
            `;

            // Insert after camera controls content
            const cameraControlsContent = document.querySelector('.camera-controls-content');
            if (cameraControlsContent) {
                cameraControlsContent.appendChild(previewContainer);
            }

            // Setup preview controls
            const previewClose = document.getElementById('preview-close');
            if (previewClose) {
                previewClose.addEventListener('click', () => this.stopPreview());
            }

            const previewFullscreen = document.getElementById('preview-fullscreen');
            if (previewFullscreen) {
                previewFullscreen.addEventListener('click', () => this.toggleFullscreen());
            }
        }

        previewContainer.style.display = 'block';
        return previewContainer;
    }

    setupPreviewCanvas(stream) {
        this.previewCanvas = document.getElementById('camera-preview-canvas');
        if (!this.previewCanvas) return;

        this.previewContext = this.previewCanvas.getContext('2d');
        
        // Create video element for stream
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.muted = true;
        
        video.addEventListener('loadedmetadata', () => {
            this.previewCanvas.width = video.videoWidth;
            this.previewCanvas.height = video.videoHeight;
            
            // Update resolution display
            const resolutionDisplay = document.getElementById('preview-resolution');
            if (resolutionDisplay) {
                resolutionDisplay.textContent = `${video.videoWidth}x${video.videoHeight}`;
            }
        });

        this.previewVideo = video;
    }

    updatePreview() {
        if (!this.previewActive || !this.previewVideo || !this.previewCanvas) {
            return;
        }

        // Draw video frame to canvas
        this.previewContext.drawImage(
            this.previewVideo, 
            0, 0, 
            this.previewCanvas.width, 
            this.previewCanvas.height
        );

        // Apply real-time effects
        this.applyCanvasEffects();

        // Schedule next frame
        this.animationFrame = requestAnimationFrame(() => this.updatePreview());
    }

    applyCanvasEffects() {
        if (!this.previewContext) return;

        const imageData = this.previewContext.getImageData(
            0, 0, 
            this.previewCanvas.width, 
            this.previewCanvas.height
        );
        
        const data = imageData.data;
        
        // Apply brightness, contrast, and saturation
        const brightness = (this.settings.brightness - 50) * 2.55;
        const contrast = (this.settings.contrast / 50);
        const saturation = this.settings.saturation / 50;

        for (let i = 0; i < data.length; i += 4) {
            // Brightness
            data[i] += brightness;     // Red
            data[i + 1] += brightness; // Green
            data[i + 2] += brightness; // Blue

            // Contrast
            data[i] = ((data[i] - 128) * contrast) + 128;
            data[i + 1] = ((data[i + 1] - 128) * contrast) + 128;
            data[i + 2] = ((data[i + 2] - 128) * contrast) + 128;

            // Saturation (simplified)
            if (saturation !== 1) {
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                data[i] = gray + saturation * (data[i] - gray);
                data[i + 1] = gray + saturation * (data[i + 1] - gray);
                data[i + 2] = gray + saturation * (data[i + 2] - gray);
            }

            // Clamp values
            data[i] = Math.max(0, Math.min(255, data[i]));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
        }

        this.previewContext.putImageData(imageData, 0, 0);
    }

    applySettingsRealTime() {
        // Apply settings to preview if active
        if (this.previewActive) {
            // Effects are applied in updatePreview loop
        }

        // Log settings change for debugging
        console.log('Camera settings updated:', this.settings);
        
        // Emit settings change event
        document.dispatchEvent(new CustomEvent('camera-settings-changed', {
            detail: { settings: this.settings }
        }));
    }

    async changeScene(sceneName) {
        try {
            this.settings.selectedScene = sceneName;
            
            if (sceneName !== 'auto') {
                const result = await window.electronAPI.obs.switchScene(sceneName);
                if (result.success) {
                    console.log(`Switched to OBS scene: ${sceneName}`);
                    this.updateSceneStatus(sceneName);
                } else {
                    console.warn('Failed to switch OBS scene:', result.error);
                    this.showError('Failed to switch OBS scene');
                }
            }
            
            this.saveSettings();
        } catch (error) {
            console.error('Scene change error:', error);
            this.showError('Failed to change scene');
        }
    }

    async refreshCameras() {
        console.log('Refreshing cameras...');
        
        try {
            // Show loading state
            const refreshButton = document.getElementById('camera-refresh');
            if (refreshButton) {
                refreshButton.textContent = '🔄 Refreshing...';
                refreshButton.disabled = true;
            }

            await this.detectCameras();
            
            // Reset button
            if (refreshButton) {
                refreshButton.textContent = '🔄 Refresh Cameras';
                refreshButton.disabled = false;
            }
            
            this.showSuccess('Cameras refreshed successfully');
        } catch (error) {
            console.error('Failed to refresh cameras:', error);
            this.showError('Failed to refresh cameras');
        }
    }

    async reconnectOBS() {
        console.log('Reconnecting to OBS...');
        
        try {
            // Show loading state
            const reconnectButton = document.getElementById('obs-reconnect');
            if (reconnectButton) {
                reconnectButton.textContent = '🔗 Connecting...';
                reconnectButton.disabled = true;
            }

            const result = await window.electronAPI.obs.connect();
            
            if (result.success) {
                this.obsConnected = true;
                this.updateOBSStatus();
                this.showSuccess('Connected to OBS successfully');
            } else {
                this.obsConnected = false;
                this.showError('Failed to connect to OBS');
            }
            
            // Reset button
            if (reconnectButton) {
                reconnectButton.textContent = '🔗 Reconnect OBS';
                reconnectButton.disabled = false;
            }
        } catch (error) {
            console.error('OBS reconnection error:', error);
            this.showError('Failed to reconnect to OBS');
        }
    }

    async updateStatus() {
        try {
            // Update OBS status
            const obsResult = await window.electronAPI.obs.isConnected();
            this.obsConnected = obsResult.connected;
            this.updateOBSStatus();

            // Update camera status
            this.updateCameraStatus();
            
            // Update scene status
            if (this.obsConnected) {
                const sceneResult = await window.electronAPI.obs.getCurrentScene();
                if (sceneResult.success) {
                    this.updateSceneStatus(sceneResult.scene);
                }
            }
        } catch (error) {
            console.error('Status update error:', error);
        }
    }

    updateOBSStatus() {
        const obsStatus = document.getElementById('obs-status');
        if (obsStatus) {
            if (this.obsConnected) {
                obsStatus.textContent = 'Connected';
                obsStatus.style.color = '#27ae60';
            } else {
                obsStatus.textContent = 'Disconnected';
                obsStatus.style.color = '#e74c3c';
            }
        }
    }

    updateCameraStatus() {
        const cameraStatus = document.getElementById('camera-status');
        if (cameraStatus) {
            if (this.selectedCamera) {
                if (this.selectedCamera.name && this.selectedCamera.name.includes('OBS')) {
                    cameraStatus.textContent = 'OBS Virtual Camera';
                    cameraStatus.style.color = '#3498db';
                } else {
                    cameraStatus.textContent = 'System Camera';
                    cameraStatus.style.color = '#27ae60';
                }
            } else {
                cameraStatus.textContent = 'No Camera';
                cameraStatus.style.color = '#e74c3c';
            }
        }
    }

    updateSceneStatus(sceneName) {
        const sceneSelect = document.getElementById('scene-select');
        if (sceneSelect && sceneName) {
            // Update scene selector if not in auto mode
            if (this.settings.selectedScene === 'auto') {
                sceneSelect.value = 'auto';
            }
        }
    }

    async loadSettings() {
        try {
            const result = await window.electronAPI.config.get('cameraSettings');
            if (result && result.success && result.value) {
                this.settings = { ...this.settings, ...result.value };
                console.log('Camera settings loaded:', this.settings);
            }
        } catch (error) {
            console.warn('Failed to load camera settings:', error);
        }
    }

    async saveSettings() {
        try {
            await window.electronAPI.config.set('cameraSettings', this.settings);
            console.log('Camera settings saved');
        } catch (error) {
            console.warn('Failed to save camera settings:', error);
        }
    }

    show() {
        const cameraControls = document.getElementById('camera-controls');
        if (cameraControls) {
            cameraControls.classList.remove('hidden');
            this.isVisible = true;
            
            // Update status when shown
            this.updateStatus();
            
            console.log('Camera controls shown');
        }
    }

    hide() {
        const cameraControls = document.getElementById('camera-controls');
        if (cameraControls) {
            cameraControls.classList.add('hidden');
            this.isVisible = false;
            
            // Stop preview when hiding
            if (this.previewActive) {
                this.stopPreview();
            }
            
            console.log('Camera controls hidden');
        }
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    toggleFullscreen() {
        const previewContainer = document.getElementById('camera-preview-container');
        if (previewContainer) {
            if (previewContainer.classList.contains('fullscreen')) {
                previewContainer.classList.remove('fullscreen');
            } else {
                previewContainer.classList.add('fullscreen');
            }
        }
    }

    showError(message) {
        console.error('Camera Controls Error:', message);
        
        // Show error notification if notification system is available
        if (window.swapInterCamChat && window.swapInterCamChat.showNotification) {
            window.swapInterCamChat.showNotification(
                'Camera Error',
                message,
                'error',
                'camera'
            );
        }
    }

    showSuccess(message) {
        console.log('Camera Controls Success:', message);
        
        // Show success notification if notification system is available
        if (window.swapInterCamChat && window.swapInterCamChat.showNotification) {
            window.swapInterCamChat.showNotification(
                'Camera',
                message,
                'success',
                'camera'
            );
        }
    }

    // Public API methods
    getSettings() {
        return { ...this.settings };
    }

    updateSetting(key, value) {
        if (key in this.settings) {
            this.settings[key] = value;
            this.applySettingsRealTime();
            this.saveSettings();
        }
    }

    isPreviewActive() {
        return this.previewActive;
    }

    getCameraInfo() {
        return {
            cameras: this.cameras,
            selectedCamera: this.selectedCamera,
            obsConnected: this.obsConnected
        };
    }

    destroy() {
        console.log('Destroying Camera Controls UI...');
        
        // Stop preview
        if (this.previewActive) {
            this.stopPreview();
        }
        
        // Clean up resources
        if (this.previewStream) {
            this.previewStream.getTracks().forEach(track => track.stop());
        }
        
        this.isInitialized = false;
    }
}

// Export for use in main scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CameraControlsUI;
} else if (typeof window !== 'undefined') {
    window.CameraControlsUI = CameraControlsUI;
}