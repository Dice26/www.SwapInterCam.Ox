/**
 * Main Face Swap UI Component
 * Integrates all face swap functionality into a single interface
 */

class FaceSwapMainUI {
    constructor() {
        this.isInitialized = false;
        this.isProcessing = false;
        this.currentMode = 'image'; // 'image' or 'realtime'
        
        this.init();
    }

    init() {
        this.createMainInterface();
        this.bindEvents();
        this.checkSystemStatus();
    }

    createMainInterface() {
        const container = document.getElementById('face-swap-container') || document.body;
        
        container.innerHTML = `
            <div class="face-swap-main">
                <div class="header">
                    <h2>🎭 SwapInterCam Face Swap</h2>
                    <div class="status-bar">
                        <span id="system-status" class="status-indicator">Checking...</span>
                        <button id="refresh-status" class="btn-icon">🔄</button>
                    </div>
                </div>

                <div class="mode-selector">
                    <button id="image-mode" class="mode-btn active">📷 Image Mode</button>
                    <button id="realtime-mode" class="mode-btn">🎥 Real-time Mode</button>
                </div>

                <div id="image-mode-panel" class="mode-panel active">
                    <div class="image-inputs">
                        <div class="input-section">
                            <h4>Source Face</h4>
                            <div class="image-upload">
                                <input type="file" id="source-image" accept="image/*">
                                <div id="source-preview" class="image-preview">
                                    <span>Click to select source image</span>
                                </div>
                            </div>
                        </div>
                        <div class="input-section">
                            <h4>Target Image</h4>
                            <div class="image-upload">
                                <input type="file" id="target-image" accept="image/*">
                                <div id="target-preview" class="image-preview">
                                    <span>Click to select target image</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="controls">
                        <button id="process-swap" class="btn-primary" disabled>🔄 Swap Faces</button>
                        <button id="clear-images" class="btn-secondary">🗑️ Clear</button>
                    </div>
                </div>

                <div id="realtime-mode-panel" class="mode-panel">
                    <div class="realtime-setup">
                        <div class="camera-section">
                            <h4>Camera Input</h4>
                            <select id="camera-select">
                                <option value="0">Default Camera</option>
                            </select>
                            <div id="camera-preview" class="camera-preview">
                                <video id="camera-video" autoplay muted></video>
                            </div>
                        </div>
                        <div class="source-section">
                            <h4>Source Face</h4>
                            <input type="file" id="realtime-source" accept="image/*">
                            <div id="realtime-source-preview" class="image-preview small">
                                <span>Select source face</span>
                            </div>
                            <button id="capture-source" class="btn-secondary">📸 Capture from Camera</button>
                        </div>
                    </div>
                    <div class="controls">
                        <button id="start-realtime" class="btn-primary" disabled>▶️ Start Real-time</button>
                        <button id="stop-realtime" class="btn-danger" disabled>⏹️ Stop</button>
                    </div>
                    <div id="realtime-stats" class="stats-panel" style="display: none;">
                        <div class="stat">FPS: <span id="fps-counter">0</span></div>
                        <div class="stat">Processed: <span id="frame-counter">0</span></div>
                        <div class="stat">Latency: <span id="latency-counter">0ms</span></div>
                    </div>
                </div>

                <div class="results-section">
                    <h4>Results</h4>
                    <div id="results-container" class="results-grid">
                        <div class="no-results">No results yet</div>
                    </div>
                </div>

                <div class="settings-panel">
                    <h4>Settings</h4>
                    <div class="settings-grid">
                        <div class="setting">
                            <label>Quality:</label>
                            <select id="quality-setting">
                                <option value="low">Low</option>
                                <option value="medium" selected>Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <div class="setting">
                            <label>Output Format:</label>
                            <select id="format-setting">
                                <option value="jpg" selected>JPG</option>
                                <option value="png">PNG</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Mode switching
        document.getElementById('image-mode').addEventListener('click', () => this.switchMode('image'));
        document.getElementById('realtime-mode').addEventListener('click', () => this.switchMode('realtime'));
        
        // Image mode events
        document.getElementById('source-image').addEventListener('change', (e) => this.handleImageSelect(e, 'source'));
        document.getElementById('target-image').addEventListener('change', (e) => this.handleImageSelect(e, 'target'));
        document.getElementById('process-swap').addEventListener('click', () => this.processImageSwap());
        document.getElementById('clear-images').addEventListener('click', () => this.clearImages());
        
        // Real-time mode events
        document.getElementById('start-realtime').addEventListener('click', () => this.startRealtime());
        document.getElementById('stop-realtime').addEventListener('click', () => this.stopRealtime());
        document.getElementById('capture-source').addEventListener('click', () => this.captureSourceFromCamera());
        
        // System events
        document.getElementById('refresh-status').addEventListener('click', () => this.checkSystemStatus());
    }

    switchMode(mode) {
        this.currentMode = mode;
        
        // Update mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${mode}-mode`).classList.add('active');
        
        // Update panels
        document.querySelectorAll('.mode-panel').forEach(panel => panel.classList.remove('active'));
        document.getElementById(`${mode}-mode-panel`).classList.add('active');
    }

    async checkSystemStatus() {
        try {
            const status = await window.electronAPI.invoke('face-swap:get-status');
            this.updateStatusIndicator(status);
        } catch (error) {
            this.updateStatusIndicator({ success: false, error: error.message });
        }
    }

    updateStatusIndicator(status) {
        const indicator = document.getElementById('system-status');
        
        if (status.success && status.initialized) {
            indicator.textContent = '✅ Ready';
            indicator.className = 'status-indicator ready';
            this.isInitialized = true;
        } else {
            indicator.textContent = '❌ Not Ready';
            indicator.className = 'status-indicator error';
            this.isInitialized = false;
        }
        
        this.updateControlStates();
    }

    updateControlStates() {
        const hasSourceImage = document.getElementById('source-image').files.length > 0;
        const hasTargetImage = document.getElementById('target-image').files.length > 0;
        
        document.getElementById('process-swap').disabled = 
            !this.isInitialized || !hasSourceImage || !hasTargetImage || this.isProcessing;
        
        document.getElementById('start-realtime').disabled = 
            !this.isInitialized || this.isProcessing;
    }

    handleImageSelect(event, type) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById(`${type}-preview`);
            preview.innerHTML = `<img src="${e.target.result}" alt="${type} image">`;
            this.updateControlStates();
        };
        reader.readAsDataURL(file);
    }

    async processImageSwap() {
        if (!this.isInitialized) return;
        
        this.isProcessing = true;
        this.updateControlStates();
        
        try {
            const sourceFile = document.getElementById('source-image').files[0];
            const targetFile = document.getElementById('target-image').files[0];
            
            // Convert files to base64
            const sourceData = await this.fileToBase64(sourceFile);
            const targetData = await this.fileToBase64(targetFile);
            
            const result = await window.electronAPI.invoke('face-swap:process-images', {
                sourceImage: sourceData,
                targetImage: targetData,
                quality: document.getElementById('quality-setting').value,
                format: document.getElementById('format-setting').value
            });
            
            if (result.success) {
                this.displayResult(result.result);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Face swap failed:', error);
            alert(`Face swap failed: ${error.message}`);
        } finally {
            this.isProcessing = false;
            this.updateControlStates();
        }
    }

    async startRealtime() {
        // Implementation for real-time face swapping
        console.log('Starting real-time face swap...');
    }

    async stopRealtime() {
        // Implementation for stopping real-time face swapping
        console.log('Stopping real-time face swap...');
    }

    clearImages() {
        document.getElementById('source-image').value = '';
        document.getElementById('target-image').value = '';
        document.getElementById('source-preview').innerHTML = '<span>Click to select source image</span>';
        document.getElementById('target-preview').innerHTML = '<span>Click to select target image</span>';
        this.updateControlStates();
    }

    displayResult(result) {
        const container = document.getElementById('results-container');
        
        if (container.querySelector('.no-results')) {
            container.innerHTML = '';
        }
        
        const resultElement = document.createElement('div');
        resultElement.className = 'result-item';
        resultElement.innerHTML = `
            <img src="data:image/jpeg;base64,${result.imageData}" alt="Result">
            <div class="result-info">
                <div>Processing Time: ${result.processingTime}ms</div>
                <div>Faces Detected: ${result.facesDetected}</div>
            </div>
        `;
        
        container.appendChild(resultElement);
    }

    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new FaceSwapMainUI();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FaceSwapMainUI;
}
