/**
 * 
 * Face Swap Controls Component
 * UI component for managing face swap operations
 */

class FaceSwapControls {
    constructor(container) {
        this.container = container;
        this.isInitialized = false;
        this.isProcessing = false;
        this.currentSession = null;
        
        // UI elements
        this.elements = {};
        
        // Configuration
        this.config = {
            quality: 'high',
            outputFormat: 'jpg',
            realTimeEnabled: false
        };
        
        this.init();
    }

    init() {
        this.createUI();
        this.bindEvents();
        this.updateStatus();
        console.log('🎭 Face Swap Controls initialized');
    }

    createUI() {
        this.container.innerHTML = `
            <div class="face-swap-controls">
                <div class="control-header">
                    <h3>🎭 Face Swap Controls</h3>
                    <div class="status-indicator" id="faceSwapStatus">
                        <span class="status-dot"></span>
                        <span class="status-text">Initializing...</span>
                    </div>
                </div>

                <div class="control-sections">
                    <!-- Initialization Section -->
                    <div class="control-section">
                        <h4>🚀 System</h4>
                        <div class="control-group">
                            <button id="initializeFaceSwap" class="btn btn-primary">
                                Initialize Face Swap
                            </button>
                            <button id="downloadModels" class="btn btn-secondary">
                                Download AI Models
                            </button>
                            <button id="checkStatus" class="btn btn-info">
                                Check Status
                            </button>
                        </div>
                    </div>

                    <!-- Image Processing Section -->
                    <div class="control-section">
                        <h4>🖼️ Image Processing</h4>
                        <div class="file-inputs">
                            <div class="input-group">
                                <label for="sourceImage">Source Image:</label>
                                <input type="file" id="sourceImage" accept="image/*" />
                                <div class="preview" id="sourcePreview"></div>
                            </div>
                            <div class="input-group">
                                <label for="targetImage">Target Image:</label>
                                <input type="file" id="targetImage" accept="image/*" />
                                <div class="preview" id="targetPreview"></div>
                            </div>
                        </div>
                        <div class="control-group">
                            <button id="processImages" class="btn btn-success" disabled>
                                🔄 Process Face Swap
                            </button>
                            <button id="clearImages" class="btn btn-warning">
                                🗑️ Clear Images
                            </button>
                        </div>
                    </div>

                    <!-- Real-time Processing Section -->
                    <div class="control-section">
                        <h4>🎥 Real-time Processing</h4>
                        <div class="control-group">
                            <select id="cameraSource">
                                <option value="0">Default Camera</option>
                                <option value="1">Camera 2</option>
                                <option value="2">Camera 3</option>
                            </select>
                            <button id="startRealTime" class="btn btn-success" disabled>
                                ▶️ Start Real-time
                            </button>
                            <button id="stopRealTime" class="btn btn-danger" disabled>
                                ⏹️ Stop Real-time
                            </button>
                        </div>
                        <div class="real-time-stats" id="realTimeStats" style="display: none;">
                            <div class="stat">
                                <span class="label">FPS:</span>
                                <span class="value" id="currentFPS">0</span>
                            </div>
                            <div class="stat">
                                <span class="label">Frames:</span>
                                <span class="value" id="frameCount">0</span>
                            </div>
                            <div class="stat">
                                <span class="label">Duration:</span>
                                <span class="value" id="sessionDuration">00:00</span>
                            </div>
                        </div>
                    </div>

                    <!-- Settings Section -->
                    <div class="control-section">
                        <h4>⚙️ Settings</h4>
                        <div class="settings-grid">
                            <div class="setting-item">
                                <label for="qualitySelect">Quality:</label>
                                <select id="qualitySelect">
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high" selected>High</option>
                                    <option value="ultra">Ultra</option>
                                </select>
                            </div>
                            <div class="setting-item">
                                <label for="formatSelect">Output Format:</label>
                                <select id="formatSelect">
                                    <option value="jpg" selected>JPG</option>
                                    <option value="png">PNG</option>
                                    <option value="mp4">MP4</option>
                                </select>
                            </div>
                            <div class="setting-item">
                                <label for="cacheResults">Cache Results:</label>
                                <input type="checkbox" id="cacheResults" checked />
                            </div>
                        </div>
                        <button id="applySettings" class="btn btn-primary">
                            Apply Settings
                        </button>
                    </div>

                    <!-- Progress Section -->
                    <div class="control-section">
                        <h4>📊 Progress</h4>
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div class="progress-fill" id="progressFill" style="width: 0%"></div>
                            </div>
                            <div class="progress-text" id="progressText">Ready</div>
                        </div>
                        <div class="log-container">
                            <div class="log-header">
                                <span>Activity Log</span>
                                <button id="clearLog" class="btn-small">Clear</button>
                            </div>
                            <div class="log-content" id="logContent"></div>
                        </div>
                    </div>

                    <!-- Results Section -->
                    <div class="control-section">
                        <h4>🎯 Results</h4>
                        <div class="results-container" id="resultsContainer">
                            <div class="no-results">No results yet</div>
                        </div>
                        <div class="control-group">
                            <button id="openOutputFolder" class="btn btn-info">
                                📁 Open Output Folder
                            </button>
                            <button id="clearResults" class="btn btn-warning">
                                🗑️ Clear Results
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Store element references
        this.elements = {
            status: document.getElementById('faceSwapStatus'),
            initializeBtn: document.getElementById('initializeFaceSwap'),
            downloadModelsBtn: document.getElementById('downloadModels'),
            checkStatusBtn: document.getElementById('checkStatus'),
            sourceImage: document.getElementById('sourceImage'),
            targetImage: document.getElementById('targetImage'),
            sourcePreview: document.getElementById('sourcePreview'),
            targetPreview: document.getElementById('targetPreview'),
            processImagesBtn: document.getElementById('processImages'),
            clearImagesBtn: document.getElementById('clearImages'),
            cameraSource: document.getElementById('cameraSource'),
            startRealTimeBtn: document.getElementById('startRealTime'),
            stopRealTimeBtn: document.getElementById('stopRealTime'),
            realTimeStats: document.getElementById('realTimeStats'),
            currentFPS: document.getElementById('currentFPS'),
            frameCount: document.getElementById('frameCount'),
            sessionDuration: document.getElementById('sessionDuration'),
            qualitySelect: document.getElementById('qualitySelect'),
            formatSelect: document.getElementById('formatSelect'),
            cacheResults: document.getElementById('cacheResults'),
            applySettingsBtn: document.getElementById('applySettings'),
            progressFill: document.getElementById('progressFill'),
            progressText: document.getElementById('progressText'),
            logContent: document.getElementById('logContent'),
            clearLogBtn: document.getElementById('clearLog'),
            resultsContainer: document.getElementById('resultsContainer'),
            openOutputFolderBtn: document.getElementById('openOutputFolder'),
            clearResultsBtn: document.getElementById('clearResults')
        };
    }

    bindEvents() {
        // System controls
        this.elements.initializeBtn.addEventListener('click', () => this.initializeFaceSwap());
        this.elements.downloadModelsBtn.addEventListener('click', () => this.downloadModels());
        this.elements.checkStatusBtn.addEventListener('click', () => this.checkStatus());

        // Image processing
        this.elements.sourceImage.addEventListener('change', (e) => this.handleImageSelect(e, 'source'));
        this.elements.targetImage.addEventListener('change', (e) => this.handleImageSelect(e, 'target'));
        this.elements.processImagesBtn.addEventListener('click', () => this.processImages());
        this.elements.clearImagesBtn.addEventListener('click', () => this.clearImages());

        // Real-time processing
        this.elements.startRealTimeBtn.addEventListener('click', () => this.startRealTime());
        this.elements.stopRealTimeBtn.addEventListener('click', () => this.stopRealTime());

        // Settings
        this.elements.applySettingsBtn.addEventListener('click', () => this.applySettings());

        // Utility
        this.elements.clearLogBtn.addEventListener('click', () => this.clearLog());
        this.elements.openOutputFolderBtn.addEventListener('click', () => this.openOutputFolder());
        this.elements.clearResultsBtn.addEventListener('click', () => this.clearResults());
    }

    async initializeFaceSwap() {
        this.log('🚀 Initializing Face Swap system...');
        this.setProcessing(true);

        try {
            const result = await this.sendRequest('/face-swap/initialize', {});
            
            if (result.success) {
                this.isInitialized = true;
                this.updateStatus('ready', 'Ready');
                this.log('✅ Face Swap system initialized successfully');
                this.enableControls();
            } else {
                throw new Error(result.error || 'Initialization failed');
            }
        } catch (error) {
            this.log(`❌ Initialization failed: ${error.message}`);
            this.updateStatus('error', 'Error');
        } finally {
            this.setProcessing(false);
        }
    }

    async downloadModels() {
        this.log('📥 Downloading AI models...');
        this.setProcessing(true);
        this.setProgress(0, 'Downloading models...');

        try {
            const result = await this.sendRequest('/face-swap/downloadModels', {});
            
            if (result.success) {
                this.log('✅ AI models downloaded successfully');
                this.setProgress(100, 'Models ready');
            } else {
                throw new Error(result.error || 'Download failed');
            }
        } catch (error) {
            this.log(`❌ Model download failed: ${error.message}`);
            this.setProgress(0, 'Download failed');
        } finally {
            this.setProcessing(false);
        }
    }

    async checkStatus() {
        try {
            const result = await this.sendRequest('/face-swap/getStatus', {});
            
            if (result.success) {
                const status = result.result;
                this.log(`📊 System Status: ${status.initialized ? 'Ready' : 'Not Ready'}`);
                this.log(`🔄 Processing: ${status.processing ? 'Active' : 'Idle'}`);
                this.log(`📋 Queue Size: ${status.queueSize}`);
                
                if (status.initialized) {
                    this.isInitialized = true;
                    this.updateStatus('ready', 'Ready');
                    this.enableControls();
                }
            }
        } catch (error) {
            this.log(`❌ Status check failed: ${error.message}`);
        }
    }

    handleImageSelect(event, type) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = type === 'source' ? this.elements.sourcePreview : this.elements.targetPreview;
            preview.innerHTML = `<img src="${e.target.result}" alt="${type} image" style="max-width: 150px; max-height: 150px;">`;
            
            this.log(`📷 ${type.charAt(0).toUpperCase() + type.slice(1)} image selected: ${file.name}`);
            this.checkProcessingReady();
        };
        reader.readAsDataURL(file);
    }

    checkProcessingReady() {
        const hasSource = this.elements.sourceImage.files.length > 0;
        const hasTarget = this.elements.targetImage.files.length > 0;
        const canProcess = this.isInitialized && hasSource && hasTarget && !this.isProcessing;
        
        this.elements.processImagesBtn.disabled = !canProcess;
        this.elements.startRealTimeBtn.disabled = !this.isInitialized || this.isProcessing;
    }

    async processImages() {
        const sourceFile = this.elements.sourceImage.files[0];
        const targetFile = this.elements.targetImage.files[0];
        
        if (!sourceFile || !targetFile) {
            this.log('❌ Please select both source and target images');
            return;
        }

        this.log('🔄 Processing face swap...');
        this.setProcessing(true);
        this.setProgress(0, 'Processing...');

        try {
            // In a real implementation, you would upload the files and get paths
            const sourcePath = `temp/${sourceFile.name}`;
            const targetPath = `temp/${targetFile.name}`;
            
            const result = await this.sendRequest('/face-swap/performFaceSwap', {
                sourcePath,
                targetPath,
                options: {
                    quality: this.config.quality,
                    outputFormat: this.config.outputFormat
                }
            });
            
            if (result.success) {
                this.log(`✅ Face swap completed: ${result.result.outputPath}`);
                this.setProgress(100, 'Completed');
                this.displayResult(result.result);
            } else {
                throw new Error(result.error || 'Processing failed');
            }
        } catch (error) {
            this.log(`❌ Processing failed: ${error.message}`);
            this.setProgress(0, 'Failed');
        } finally {
            this.setProcessing(false);
        }
    }

    async startRealTime() {
        this.log('🎥 Starting real-time face swap...');
        this.setProcessing(true);

        try {
            const sourceFile = this.elements.sourceImage.files[0];
            if (!sourceFile) {
                throw new Error('Please select a source image first');
            }

            const result = await this.sendRequest('/face-swap/startRealTimeSwap', {
                sourceImage: `temp/${sourceFile.name}`,
                inputStream: this.elements.cameraSource.value,
                outputStream: 'virtual_camera'
            });
            
            if (result.success) {
                this.currentSession = result.result.sessionId;
                this.log(`✅ Real-time face swap started (Session: ${this.currentSession})`);
                this.elements.realTimeStats.style.display = 'block';
                this.elements.startRealTimeBtn.disabled = true;
                this.elements.stopRealTimeBtn.disabled = false;
                this.startStatsUpdate();
            } else {
                throw new Error(result.error || 'Failed to start real-time processing');
            }
        } catch (error) {
            this.log(`❌ Real-time start failed: ${error.message}`);
            this.setProcessing(false);
        }
    }

    async stopRealTime() {
        this.log('🛑 Stopping real-time face swap...');

        try {
            const result = await this.sendRequest('/face-swap/stopRealTimeSwap', {});
            
            if (result.success) {
                this.log(`✅ Real-time face swap stopped`);
                this.elements.realTimeStats.style.display = 'none';
                this.elements.startRealTimeBtn.disabled = false;
                this.elements.stopRealTimeBtn.disabled = true;
                this.currentSession = null;
                this.stopStatsUpdate();
            }
        } catch (error) {
            this.log(`❌ Stop failed: ${error.message}`);
        } finally {
            this.setProcessing(false);
        }
    }

    async applySettings() {
        this.config.quality = this.elements.qualitySelect.value;
        this.config.outputFormat = this.elements.formatSelect.value;
        this.config.cacheResults = this.elements.cacheResults.checked;

        try {
            const result = await this.sendRequest('/face-swap/configureSettings', this.config);
            
            if (result.success) {
                this.log('✅ Settings applied successfully');
            } else {
                throw new Error(result.error || 'Settings update failed');
            }
        } catch (error) {
            this.log(`❌ Settings update failed: ${error.message}`);
        }
    }

    clearImages() {
        this.elements.sourceImage.value = '';
        this.elements.targetImage.value = '';
        this.elements.sourcePreview.innerHTML = '';
        this.elements.targetPreview.innerHTML = '';
        this.checkProcessingReady();
        this.log('🗑️ Images cleared');
    }

    clearLog() {
        this.elements.logContent.innerHTML = '';
    }

    clearResults() {
        this.elements.resultsContainer.innerHTML = '<div class="no-results">No results yet</div>';
        this.log('🗑️ Results cleared');
    }

    openOutputFolder() {
        // In a real implementation, this would open the output folder
        this.log('📁 Opening output folder...');
    }

    displayResult(result) {
        const resultElement = document.createElement('div');
        resultElement.className = 'result-item';
        resultElement.innerHTML = `
            <div class="result-info">
                <strong>Output:</strong> ${result.outputPath}<br>
                <strong>Processing Time:</strong> ${result.processingTime}ms<br>
                <strong>Job ID:</strong> ${result.jobId}
            </div>
            <div class="result-actions">
                <button onclick="this.openResult('${result.outputPath}')" class="btn-small">Open</button>
                <button onclick="this.shareResult('${result.outputPath}')" class="btn-small">Share</button>
            </div>
        `;
        
        if (this.elements.resultsContainer.querySelector('.no-results')) {
            this.elements.resultsContainer.innerHTML = '';
        }
        
        this.elements.resultsContainer.appendChild(resultElement);
    }

    startStatsUpdate() {
        this.statsInterval = setInterval(() => {
            if (this.currentSession) {
                // Update stats display
                this.elements.frameCount.textContent = Math.floor(Math.random() * 1000);
                this.elements.currentFPS.textContent = (Math.random() * 30 + 15).toFixed(1);
                
                // Update duration
                const duration = Date.now() - (this.sessionStartTime || Date.now());
                const minutes = Math.floor(duration / 60000);
                const seconds = Math.floor((duration % 60000) / 1000);
                this.elements.sessionDuration.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
        
        this.sessionStartTime = Date.now();
    }

    stopStatsUpdate() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
        }
    }

    updateStatus(type, text) {
        const statusDot = this.elements.status.querySelector('.status-dot');
        const statusText = this.elements.status.querySelector('.status-text');
        
        statusDot.className = `status-dot ${type}`;
        statusText.textContent = text;
    }

    setProcessing(processing) {
        this.isProcessing = processing;
        this.checkProcessingReady();
        
        if (processing) {
            this.updateStatus('processing', 'Processing...');
        } else if (this.isInitialized) {
            this.updateStatus('ready', 'Ready');
        }
    }

    setProgress(percentage, text) {
        this.elements.progressFill.style.width = `${percentage}%`;
        this.elements.progressText.textContent = text;
    }

    enableControls() {
        this.checkProcessingReady();
    }

    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
        
        this.elements.logContent.appendChild(logEntry);
        this.elements.logContent.scrollTop = this.elements.logContent.scrollHeight;
    }

    async sendRequest(path, payload) {
        // In a real implementation, this would use IPC to communicate with the main process
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    result: { message: 'Mock response' }
                });
            }, 1000);
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FaceSwapControls;
}