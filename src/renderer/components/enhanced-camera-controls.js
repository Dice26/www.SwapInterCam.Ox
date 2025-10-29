/**
 * Enhanced Camera Controls with Real-time Preview
 * Provides advanced camera control interface for SwapInterCam Chat Desktop UI
 */

class EnhancedCameraControls {
    constructor() {
        this.isVisible = false;
        this.previewStream = null;
        this.filters = {
            sharpness: 50,
            brightness: 0,
            contrast: 100,
            saturation: 100
        };
        this.fpsMonitor = null;
        this.isFullscreen = false;
        
        this.initialize();
    }

    initialize() {
        console.log('Initializing Enhanced Camera Controls...');
        
        this.setupEventListeners();
        this.loadSavedSettings();
        
        console.log('Enhanced Camera Controls initialized');
    }

    setupEventListeners() {
        // Toggle preview button
        const togglePreviewBtn = document.getElementById('toggle-preview');
        if (togglePreviewBtn) {
            togglePreviewBtn.addEventListener('click', () => {
                this.toggleCameraPreview();
            });
        }

        // Fullscreen button
        const fullscreenBtn = document.getElementById('fullscreen-preview');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                this.toggleFullscreenPreview();
            });
        }

        // Close button
        const closeBtn = document.getElementById('camera-controls-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hide();
            });
        }

        // Initialize all sliders
        this.setupSliders();
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    setupSliders() {
        // Sharpness slider
        this.setupSlider('sharpness-slider', 'sharpness-value', (value) => {
            this.filters.sharpness = value;
            this.applyFilters();
            this.saveSettings();
        });

        // Brightness slider
        this.setupSlider('brightness-slider', 'brightness-value', (value) => {
            this.filters.brightness = value;
            this.applyFilters();
            this.saveSettings();
        });

        // Contrast slider
        this.setupSlider('contrast-slider', 'contrast-value', (value) => {
            this.filters.contrast = value;
            this.applyFilters();
            this.saveSettings();
        });
    }

    setupSlider(sliderId, valueId, callback) {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(valueId);
        
        if (slider && valueDisplay) {
            slider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                valueDisplay.textContent = `${value}%`;
                callback(value);
            });

            // Initialize display
            valueDisplay.textContent = `${slider.value}%`;
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (!this.isVisible) return;
            
            // Ctrl+P: Toggle preview
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                this.toggleCameraPreview();
            }
            
            // F11: Toggle fullscreen
            if (e.key === 'F11') {
                e.preventDefault();
                this.toggleFullscreenPreview();
            }
            
            // Escape: Close controls
            if (e.key === 'Escape') {
                e.preventDefault();
                this.hide();
            }
        });
    }

    async show() {
        const cameraControls = document.getElementById('camera-controls');
        if (cameraControls) {
            cameraControls.classList.remove('hidden');
            this.isVisible = true;
            
            // Initialize camera preview
            await this.initializeCameraPreview();
            
            this.emitEvent('controls-shown');
        }
    }

    hide() {
        const cameraControls = document.getElementById('camera-controls');
        if (cameraControls) {
            cameraControls.classList.add('hidden');
            this.isVisible = false;
            
            // Stop camera preview
            this.stopCameraPreview();
            
            this.emitEvent('controls-hidden');
        }
    }

    async initializeCameraPreview() {
        const cameraPreview = document.getElementById('camera-preview');
        const previewStatus = document.getElementById('preview-status');
        
        if (!cameraPreview || !previewStatus) return;

        try {
            previewStatus.textContent = 'Connecting to camera...';
            previewStatus.className = 'preview-status connecting';
            
            // Get camera stream
            this.previewStream = await this.getCameraStream();
            
            if (this.previewStream) {
                cameraPreview.srcObject = this.previewStream;
                previewStatus.textContent = 'Connected';
                previewStatus.className = 'preview-status connected';
                
                // Apply current filters
                this.applyFilters();
                
                // Start FPS monitoring
                this.startFPSMonitoring();
                
                // Update quality indicator
                this.updateQualityIndicator();
                
                this.emitEvent('preview-started');
            } else {
                throw new Error('No camera stream available');
            }
        } catch (error) {
            console.error('Failed to initialize camera preview:', error);
            previewStatus.textContent = 'Camera unavailable';
            previewStatus.className = 'preview-status error';
            
            this.emitEvent('preview-error', { error: error.message });
        }
    }

    async getCameraStream() {
        try {
            // Enumerate available devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            // Look for OBS Virtual Camera first
            const obsCamera = videoDevices.find(device => 
                device.label.toLowerCase().includes('obs') ||
                device.label.toLowerCase().includes('virtual')
            );

            const constraints = {
                video: {
                    deviceId: obsCamera ? { exact: obsCamera.deviceId } : undefined,
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                    frameRate: { ideal: 30, max: 60 }
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Log camera info
            const track = stream.getVideoTracks()[0];
            const settings = track.getSettings();
            console.log('Camera stream initialized:', {
                device: obsCamera ? obsCamera.label : 'Default camera',
                resolution: `${settings.width}x${settings.height}`,
                frameRate: settings.frameRate
            });
            
            return stream;
        } catch (error) {
            console.error('Failed to get camera stream:', error);
            
            // Try fallback with basic constraints
            try {
                return await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480 }
                });
            } catch (fallbackError) {
                console.error('Fallback camera access failed:', fallbackError);
                return null;
            }
        }
    }

    toggleCameraPreview() {
        const cameraPreview = document.getElementById('camera-preview');
        const toggleBtn = document.getElementById('toggle-preview');
        
        if (!cameraPreview || !toggleBtn) return;
        
        if (cameraPreview.style.display === 'none') {
            cameraPreview.style.display = 'block';
            toggleBtn.textContent = '📹';
            toggleBtn.title = 'Hide Preview';
            this.initializeCameraPreview();
        } else {
            cameraPreview.style.display = 'none';
            toggleBtn.textContent = '🚫';
            toggleBtn.title = 'Show Preview';
            this.stopCameraPreview();
        }
    }

    toggleFullscreenPreview() {
        const cameraPreview = document.getElementById('camera-preview');
        
        if (!cameraPreview) return;
        
        if (!this.isFullscreen) {
            if (cameraPreview.requestFullscreen) {
                cameraPreview.requestFullscreen();
            } else if (cameraPreview.webkitRequestFullscreen) {
                cameraPreview.webkitRequestFullscreen();
            } else if (cameraPreview.mozRequestFullScreen) {
                cameraPreview.mozRequestFullScreen();
            }
            this.isFullscreen = true;
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            }
            this.isFullscreen = false;
        }
    }

    stopCameraPreview() {
        if (this.previewStream) {
            const tracks = this.previewStream.getTracks();
            tracks.forEach(track => track.stop());
            this.previewStream = null;
        }
        
        const cameraPreview = document.getElementById('camera-preview');
        if (cameraPreview) {
            cameraPreview.srcObject = null;
        }
        
        // Stop FPS monitoring
        if (this.fpsMonitor) {
            cancelAnimationFrame(this.fpsMonitor);
            this.fpsMonitor = null;
        }
        
        this.emitEvent('preview-stopped');
    }

    applyFilters() {
        const cameraPreview = document.getElementById('camera-preview');
        if (!cameraPreview) return;
        
        const filterString = [
            `brightness(${100 + this.filters.brightness}%)`,
            `contrast(${this.filters.contrast}%)`,
            `saturate(${this.filters.saturation}%)`,
            `blur(${Math.max(0, (100 - this.filters.sharpness) / 20)}px)`
        ].join(' ');
        
        cameraPreview.style.filter = filterString;
        
        this.emitEvent('filters-applied', { filters: this.filters });
    }

    startFPSMonitoring() {
        let frameCount = 0;
        let lastTime = performance.now();
        
        const updateFPS = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                const fps = Math.round(frameCount * 1000 / (currentTime - lastTime));
                
                // Update FPS display
                const fpsDisplay = document.getElementById('fps-display');
                if (fpsDisplay) {
                    fpsDisplay.textContent = fps;
                }
                
                // Update quality indicator based on FPS
                this.updateQualityIndicator(fps);
                
                frameCount = 0;
                lastTime = currentTime;
            }
            
            if (this.previewStream) {
                this.fpsMonitor = requestAnimationFrame(updateFPS);
            }
        };
        
        this.fpsMonitor = requestAnimationFrame(updateFPS);
    }

    updateQualityIndicator(fps = 30) {
        const qualityIndicator = document.getElementById('quality-indicator');
        if (!qualityIndicator) return;
        
        let quality, className;
        
        if (fps >= 25) {
            quality = 'Excellent';
            className = 'quality-indicator excellent';
        } else if (fps >= 20) {
            quality = 'Good';
            className = 'quality-indicator good';
        } else if (fps >= 15) {
            quality = 'Fair';
            className = 'quality-indicator fair';
        } else {
            quality = 'Poor';
            className = 'quality-indicator poor';
        }
        
        qualityIndicator.textContent = quality;
        qualityIndicator.className = className;
    }

    resetControls() {
        // Reset all filters to default
        this.filters = {
            sharpness: 50,
            brightness: 0,
            contrast: 100,
            saturation: 100
        };
        
        // Update sliders
        const sliders = [
            { id: 'sharpness-slider', value: 50 },
            { id: 'brightness-slider', value: 0 },
            { id: 'contrast-slider', value: 100 }
        ];
        
        sliders.forEach(({ id, value }) => {
            const slider = document.getElementById(id);
            if (slider) {
                slider.value = value;
                slider.dispatchEvent(new Event('input'));
            }
        });
        
        this.applyFilters();
        this.saveSettings();
        
        this.emitEvent('controls-reset');
    }

    saveSettings() {
        try {
            const settings = {
                filters: this.filters,
                timestamp: Date.now()
            };
            
            localStorage.setItem('swapintercam-camera-settings', JSON.stringify(settings));
        } catch (error) {
            console.error('Failed to save camera settings:', error);
        }
    }

    loadSavedSettings() {
        try {
            const saved = localStorage.getItem('swapintercam-camera-settings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.filters = { ...this.filters, ...settings.filters };
                
                // Apply to sliders
                Object.entries(this.filters).forEach(([key, value]) => {
                    const slider = document.getElementById(`${key}-slider`);
                    if (slider) {
                        slider.value = value;
                        slider.dispatchEvent(new Event('input'));
                    }
                });
            }
        } catch (error) {
            console.error('Failed to load camera settings:', error);
        }
    }

    getStatus() {
        return {
            visible: this.isVisible,
            previewActive: this.previewStream !== null,
            fullscreen: this.isFullscreen,
            filters: { ...this.filters }
        };
    }

    emitEvent(eventName, data = {}) {
        const event = new CustomEvent(`camera-controls-${eventName}`, {
            detail: { ...data, timestamp: Date.now() }
        });
        document.dispatchEvent(event);
    }

    destroy() {
        console.log('Destroying Enhanced Camera Controls...');
        
        this.stopCameraPreview();
        this.hide();
        
        if (this.fpsMonitor) {
            cancelAnimationFrame(this.fpsMonitor);
        }
        
        this.emitEvent('controls-destroyed');
    }
}

// Export for use in main scripts
window.EnhancedCameraControls = EnhancedCameraControls;