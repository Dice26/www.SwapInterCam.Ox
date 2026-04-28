/**
 * Camera Stream Controller
 * Manages video stream lifecycle, prevents premature stream termination
 */

class CameraStreamController {
    constructor() {
        this.activeStreams = new Map();
        this.streamConstraints = new Map();
        this.streamMetadata = new Map();
        this.videoElements = new Map();
        this.streamHealthMonitor = null;
        this.reconnectAttempts = new Map();
        this.maxReconnectAttempts = 5;
        this.streamTimeout = null;
        
        this.initialize();
    }

    async initialize() {
        console.log('🎥 Initializing Camera Stream Controller...');
        
        try {
            // Setup stream health monitoring
            this.startStreamHealthMonitoring();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Prevent accidental stream termination
            this.setupStreamProtection();
            
            console.log('✅ Camera Stream Controller initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Camera Stream Controller:', error);
        }
    }

    /**
     * Create a persistent video stream
     * @param {Object} constraints - Stream constraints
     * @param {string} streamId - Unique stream identifier
     * @returns {Promise<Object>} Stream creation result
     */
    async createStream(constraints = {}, streamId = 'default') {
        console.log(`🎬 Creating stream: ${streamId}`, constraints);
        
        try {
            // Default constraints with fallbacks
            const defaultConstraints = {
                video: {
                    width: { ideal: 1280, max: 1920, min: 320 },
                    height: { ideal: 720, max: 1080, min: 240 },
                    frameRate: { ideal: 30, max: 60, min: 15 }
                }
            };
            
            const finalConstraints = this.mergeConstraints(defaultConstraints, constraints);
            
            // Store constraints for potential reconnection
            this.streamConstraints.set(streamId, finalConstraints);
            
            // Create the stream
            const stream = await navigator.mediaDevices.getUserMedia(finalConstraints);
            
            // Store stream with metadata
            this.activeStreams.set(streamId, stream);
            this.streamMetadata.set(streamId, {
                id: streamId,
                created: Date.now(),
                constraints: finalConstraints,
                reconnectAttempts: 0,
                lastHealthCheck: Date.now(),
                isHealthy: true,
                videoTrack: stream.getVideoTracks()[0],
                settings: stream.getVideoTracks()[0]?.getSettings()
            });
            
            // Setup stream event listeners
            this.setupStreamEventListeners(stream, streamId);
            
            // Reset reconnect attempts on successful creation
            this.reconnectAttempts.set(streamId, 0);
            
            console.log(`✅ Stream created successfully: ${streamId}`, {
                tracks: stream.getTracks().length,
                videoTracks: stream.getVideoTracks().length,
                settings: stream.getVideoTracks()[0]?.getSettings()
            });
            
            // Emit stream created event
            this.emitStreamEvent('stream-created', {
                streamId,
                stream,
                metadata: this.streamMetadata.get(streamId)
            });
            
            return {
                success: true,
                stream,
                streamId,
                metadata: this.streamMetadata.get(streamId)
            };
            
        } catch (error) {
            console.error(`❌ Failed to create stream: ${streamId}`, error);
            
            // Try fallback constraints
            const fallbackResult = await this.tryFallbackConstraints(streamId, error);
            if (fallbackResult.success) {
                return fallbackResult;
            }
            
            // Emit stream error event
            this.emitStreamEvent('stream-error', {
                streamId,
                error: error.message,
                constraints: finalConstraints
            });
            
            return {
                success: false,
                error: error.message,
                streamId
            };
        }
    }

    /**
     * Attach stream to video element with persistence
     * @param {string} streamId - Stream identifier
     * @param {HTMLVideoElement|string} videoElement - Video element or selector
     * @returns {boolean} Success status
     */
    attachStreamToElement(streamId, videoElement) {
        console.log(`🔗 Attaching stream ${streamId} to video element`);
        
        try {
            const stream = this.activeStreams.get(streamId);
            if (!stream) {
                console.error(`❌ Stream not found: ${streamId}`);
                return false;
            }
            
            // Get video element
            let element;
            if (typeof videoElement === 'string') {
                element = document.querySelector(videoElement) || document.getElementById(videoElement);
            } else {
                element = videoElement;
            }
            
            if (!element) {
                console.error(`❌ Video element not found:`, videoElement);
                return false;
            }
            
            // Store element reference
            this.videoElements.set(streamId, element);
            
            // Attach stream to element
            element.srcObject = stream;
            element.autoplay = true;
            element.muted = true;
            element.playsInline = true;
            
            // Ensure element is visible and properly sized
            this.ensureElementVisibility(element);
            
            // Setup element event listeners
            this.setupVideoElementListeners(element, streamId);
            
            // Prevent stream from being garbage collected
            this.protectStream(streamId);
            
            console.log(`✅ Stream attached successfully: ${streamId}`);
            
            // Emit attachment event
            this.emitStreamEvent('stream-attached', {
                streamId,
                element,
                elementId: element.id
            });
            
            return true;
            
        } catch (error) {
            console.error(`❌ Failed to attach stream: ${streamId}`, error);
            return false;
        }
    }

    /**
     * Protect stream from premature termination
     * @param {string} streamId - Stream identifier
     */
    protectStream(streamId) {
        const stream = this.activeStreams.get(streamId);
        if (!stream) return;
        
        // Clear any existing timeout
        if (this.streamTimeout) {
            clearTimeout(this.streamTimeout);
        }
        
        // Prevent automatic cleanup
        stream._protected = true;
        
        // Add reference to prevent garbage collection
        if (!window._protectedStreams) {
            window._protectedStreams = new Map();
        }
        window._protectedStreams.set(streamId, stream);
        
        console.log(`🛡️ Stream protected from termination: ${streamId}`);
    }

    /**
     * Setup stream event listeners to detect issues
     * @param {MediaStream} stream - Media stream
     * @param {string} streamId - Stream identifier
     */
    setupStreamEventListeners(stream, streamId) {
        const videoTrack = stream.getVideoTracks()[0];
        if (!videoTrack) return;
        
        // Track ended event
        videoTrack.addEventListener('ended', () => {
            console.warn(`⚠️ Video track ended for stream: ${streamId}`);
            this.handleStreamInterruption(streamId, 'track-ended');
        });
        
        // Track mute/unmute events
        videoTrack.addEventListener('mute', () => {
            console.warn(`🔇 Video track muted for stream: ${streamId}`);
            this.updateStreamHealth(streamId, false, 'track-muted');
        });
        
        videoTrack.addEventListener('unmute', () => {
            console.log(`🔊 Video track unmuted for stream: ${streamId}`);
            this.updateStreamHealth(streamId, true, 'track-unmuted');
        });
        
        // Monitor track state changes
        const checkTrackState = () => {
            if (videoTrack.readyState === 'ended') {
                console.warn(`⚠️ Video track state ended for stream: ${streamId}`);
                this.handleStreamInterruption(streamId, 'track-state-ended');
            }
        };
        
        // Check track state periodically
        const stateCheckInterval = setInterval(checkTrackState, 2000);
        
        // Store interval reference for cleanup
        const metadata = this.streamMetadata.get(streamId);
        if (metadata) {
            metadata.stateCheckInterval = stateCheckInterval;
        }
    }

    /**
     * Setup video element event listeners
     * @param {HTMLVideoElement} element - Video element
     * @param {string} streamId - Stream identifier
     */
    setupVideoElementListeners(element, streamId) {
        // Prevent element from being hidden
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    this.ensureElementVisibility(element);
                }
            });
        });
        
        observer.observe(element, {
            attributes: true,
            attributeFilter: ['style', 'class']
        });
        
        // Store observer reference
        const metadata = this.streamMetadata.get(streamId);
        if (metadata) {
            metadata.elementObserver = observer;
        }
        
        // Video element events
        element.addEventListener('loadedmetadata', () => {
            console.log(`📐 Video metadata loaded for stream: ${streamId}`, {
                width: element.videoWidth,
                height: element.videoHeight
            });
            
            this.emitStreamEvent('video-loaded', {
                streamId,
                width: element.videoWidth,
                height: element.videoHeight
            });
        });
        
        element.addEventListener('play', () => {
            console.log(`▶️ Video playing for stream: ${streamId}`);
            this.updateStreamHealth(streamId, true, 'video-playing');
        });
        
        element.addEventListener('pause', () => {
            console.warn(`⏸️ Video paused for stream: ${streamId}`);
            // Auto-resume if not intentionally paused
            setTimeout(() => {
                if (element.paused && !element._intentionallyPaused) {
                    element.play().catch(console.warn);
                }
            }, 1000);
        });
        
        element.addEventListener('error', (event) => {
            console.error(`❌ Video element error for stream: ${streamId}`, event);
            this.handleStreamInterruption(streamId, 'video-element-error');
        });
    }

    /**
     * Ensure video element remains visible
     * @param {HTMLVideoElement} element - Video element
     */
    ensureElementVisibility(element) {
        const computedStyle = window.getComputedStyle(element);
        
        // Fix common visibility issues
        if (computedStyle.display === 'none') {
            element.style.display = 'block';
            console.log('🔧 Fixed display: none on video element');
        }
        
        if (computedStyle.visibility === 'hidden') {
            element.style.visibility = 'visible';
            console.log('🔧 Fixed visibility: hidden on video element');
        }
        
        if (parseFloat(computedStyle.opacity) === 0) {
            element.style.opacity = '1';
            console.log('🔧 Fixed opacity: 0 on video element');
        }
        
        // Ensure minimum dimensions
        if (computedStyle.width === '0px' || !computedStyle.width) {
            element.style.width = '320px';
            console.log('🔧 Set minimum width on video element');
        }
        
        if (computedStyle.height === '0px' || !computedStyle.height) {
            element.style.height = '240px';
            console.log('🔧 Set minimum height on video element');
        }
    }

    /**
     * Handle stream interruption and attempt recovery
     * @param {string} streamId - Stream identifier
     * @param {string} reason - Interruption reason
     */
    async handleStreamInterruption(streamId, reason) {
        console.warn(`⚠️ Stream interruption detected: ${streamId} (${reason})`);
        
        const metadata = this.streamMetadata.get(streamId);
        if (!metadata) return;
        
        // Update health status
        this.updateStreamHealth(streamId, false, reason);
        
        // Attempt reconnection
        const reconnectAttempts = this.reconnectAttempts.get(streamId) || 0;
        
        if (reconnectAttempts < this.maxReconnectAttempts) {
            console.log(`🔄 Attempting to reconnect stream: ${streamId} (attempt ${reconnectAttempts + 1})`);
            
            this.reconnectAttempts.set(streamId, reconnectAttempts + 1);
            
            // Wait before reconnecting (exponential backoff)
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
            
            setTimeout(async () => {
                await this.reconnectStream(streamId);
            }, delay);
        } else {
            console.error(`❌ Max reconnection attempts reached for stream: ${streamId}`);
            this.emitStreamEvent('stream-failed', {
                streamId,
                reason: 'max-reconnect-attempts-reached'
            });
        }
    }

    /**
     * Reconnect a stream
     * @param {string} streamId - Stream identifier
     */
    async reconnectStream(streamId) {
        console.log(`🔄 Reconnecting stream: ${streamId}`);
        
        try {
            // Clean up old stream
            await this.stopStream(streamId, false);
            
            // Get stored constraints
            const constraints = this.streamConstraints.get(streamId);
            if (!constraints) {
                throw new Error('No constraints found for stream');
            }
            
            // Create new stream
            const result = await this.createStream(constraints, streamId);
            
            if (result.success) {
                // Reattach to video element if it exists
                const videoElement = this.videoElements.get(streamId);
                if (videoElement) {
                    this.attachStreamToElement(streamId, videoElement);
                }
                
                console.log(`✅ Stream reconnected successfully: ${streamId}`);
                
                this.emitStreamEvent('stream-reconnected', {
                    streamId,
                    attempts: this.reconnectAttempts.get(streamId)
                });
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error(`❌ Failed to reconnect stream: ${streamId}`, error);
            
            // Try again if attempts remaining
            const attempts = this.reconnectAttempts.get(streamId) || 0;
            if (attempts < this.maxReconnectAttempts) {
                setTimeout(() => {
                    this.handleStreamInterruption(streamId, 'reconnect-failed');
                }, 2000);
            }
        }
    }

    /**
     * Start stream health monitoring
     */
    startStreamHealthMonitoring() {
        console.log('💓 Starting stream health monitoring...');
        
        this.streamHealthMonitor = setInterval(() => {
            this.checkAllStreamsHealth();
        }, 5000); // Check every 5 seconds
    }

    /**
     * Check health of all active streams
     */
    checkAllStreamsHealth() {
        for (const [streamId, stream] of this.activeStreams) {
            this.checkStreamHealth(streamId, stream);
        }
    }

    /**
     * Check individual stream health
     * @param {string} streamId - Stream identifier
     * @param {MediaStream} stream - Media stream
     */
    checkStreamHealth(streamId, stream) {
        const metadata = this.streamMetadata.get(streamId);
        if (!metadata) return;
        
        const videoTrack = stream.getVideoTracks()[0];
        if (!videoTrack) {
            this.updateStreamHealth(streamId, false, 'no-video-track');
            return;
        }
        
        // Check track state
        if (videoTrack.readyState === 'ended') {
            this.updateStreamHealth(streamId, false, 'track-ended');
            this.handleStreamInterruption(streamId, 'health-check-track-ended');
            return;
        }
        
        // Check if stream is active
        if (!stream.active) {
            this.updateStreamHealth(streamId, false, 'stream-inactive');
            this.handleStreamInterruption(streamId, 'health-check-stream-inactive');
            return;
        }
        
        // Stream appears healthy
        this.updateStreamHealth(streamId, true, 'healthy');
    }

    /**
     * Update stream health status
     * @param {string} streamId - Stream identifier
     * @param {boolean} isHealthy - Health status
     * @param {string} reason - Status reason
     */
    updateStreamHealth(streamId, isHealthy, reason) {
        const metadata = this.streamMetadata.get(streamId);
        if (!metadata) return;
        
        const wasHealthy = metadata.isHealthy;
        metadata.isHealthy = isHealthy;
        metadata.lastHealthCheck = Date.now();
        metadata.healthReason = reason;
        
        // Log health changes
        if (wasHealthy !== isHealthy) {
            const status = isHealthy ? '✅ Healthy' : '❌ Unhealthy';
            console.log(`💓 Stream health changed: ${streamId} - ${status} (${reason})`);
            
            this.emitStreamEvent('stream-health-changed', {
                streamId,
                isHealthy,
                reason,
                metadata
            });
        }
    }

    /**
     * Try fallback constraints if main constraints fail
     * @param {string} streamId - Stream identifier
     * @param {Error} originalError - Original error
     */
    async tryFallbackConstraints(streamId, originalError) {
        console.log(`🔄 Trying fallback constraints for stream: ${streamId}`);
        
        const fallbackConstraints = [
            // Lower resolution
            { video: { width: 640, height: 480, frameRate: 30 } },
            // Even lower resolution
            { video: { width: 320, height: 240, frameRate: 15 } },
            // Minimal constraints
            { video: true },
            // Last resort
            { video: { width: 160, height: 120 } }
        ];
        
        for (const constraints of fallbackConstraints) {
            try {
                console.log(`🔄 Trying fallback:`, constraints);
                
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                
                // Store successful fallback
                this.activeStreams.set(streamId, stream);
                this.streamConstraints.set(streamId, constraints);
                this.streamMetadata.set(streamId, {
                    id: streamId,
                    created: Date.now(),
                    constraints: constraints,
                    reconnectAttempts: 0,
                    lastHealthCheck: Date.now(),
                    isHealthy: true,
                    videoTrack: stream.getVideoTracks()[0],
                    settings: stream.getVideoTracks()[0]?.getSettings(),
                    isFallback: true
                });
                
                this.setupStreamEventListeners(stream, streamId);
                
                console.log(`✅ Fallback constraints successful: ${streamId}`, constraints);
                
                this.emitStreamEvent('stream-created-fallback', {
                    streamId,
                    stream,
                    constraints,
                    originalError: originalError.message
                });
                
                return {
                    success: true,
                    stream,
                    streamId,
                    isFallback: true,
                    constraints
                };
                
            } catch (fallbackError) {
                console.log(`⚠️ Fallback failed:`, fallbackError.message);
                continue;
            }
        }
        
        return {
            success: false,
            error: 'All fallback constraints failed'
        };
    }

    /**
     * Merge constraints with defaults
     * @param {Object} defaults - Default constraints
     * @param {Object} custom - Custom constraints
     * @returns {Object} Merged constraints
     */
    mergeConstraints(defaults, custom) {
        const merged = JSON.parse(JSON.stringify(defaults));
        
        if (custom.video) {
            if (typeof custom.video === 'boolean') {
                merged.video = custom.video;
            } else {
                merged.video = { ...merged.video, ...custom.video };
            }
        }
        
        if (custom.audio !== undefined) {
            merged.audio = custom.audio;
        }
        
        return merged;
    }

    /**
     * Setup event listeners for external events
     */
    setupEventListeners() {
        // Listen for page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('📱 Page hidden - maintaining streams');
            } else {
                console.log('📱 Page visible - checking stream health');
                this.checkAllStreamsHealth();
            }
        });
        
        // Listen for beforeunload to prevent accidental stream termination
        window.addEventListener('beforeunload', (event) => {
            if (this.activeStreams.size > 0) {
                console.log('⚠️ Page unloading with active streams');
                // Don't prevent unload, but log for debugging
            }
        });
    }

    /**
     * Setup stream protection against accidental termination
     */
    setupStreamProtection() {
        // Override common stream termination methods
        const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
        
        navigator.mediaDevices.getUserMedia = async function(constraints) {
            console.log('🎥 getUserMedia called with constraints:', constraints);
            return originalGetUserMedia.call(this, constraints);
        };
        
        // Protect against accidental stream stops
        window.addEventListener('error', (event) => {
            console.warn('🚨 Global error detected:', event.error);
            // Check if any streams were affected
            setTimeout(() => {
                this.checkAllStreamsHealth();
            }, 1000);
        });
    }

    /**
     * Stop a stream
     * @param {string} streamId - Stream identifier
     * @param {boolean} cleanup - Whether to cleanup metadata
     */
    async stopStream(streamId, cleanup = true) {
        console.log(`⏹️ Stopping stream: ${streamId}`);
        
        const stream = this.activeStreams.get(streamId);
        if (stream) {
            // Stop all tracks
            stream.getTracks().forEach(track => {
                track.stop();
                console.log(`⏹️ Stopped track: ${track.kind}`);
            });
            
            // Remove from active streams
            this.activeStreams.delete(streamId);
        }
        
        // Cleanup metadata if requested
        if (cleanup) {
            const metadata = this.streamMetadata.get(streamId);
            if (metadata) {
                // Clear intervals
                if (metadata.stateCheckInterval) {
                    clearInterval(metadata.stateCheckInterval);
                }
                
                // Disconnect observers
                if (metadata.elementObserver) {
                    metadata.elementObserver.disconnect();
                }
            }
            
            this.streamMetadata.delete(streamId);
            this.streamConstraints.delete(streamId);
            this.videoElements.delete(streamId);
            this.reconnectAttempts.delete(streamId);
            
            // Remove from protected streams
            if (window._protectedStreams) {
                window._protectedStreams.delete(streamId);
            }
        }
        
        console.log(`✅ Stream stopped: ${streamId}`);
        
        this.emitStreamEvent('stream-stopped', { streamId });
    }

    /**
     * Get stream information
     * @param {string} streamId - Stream identifier
     * @returns {Object|null} Stream information
     */
    getStreamInfo(streamId) {
        const stream = this.activeStreams.get(streamId);
        const metadata = this.streamMetadata.get(streamId);
        
        if (!stream || !metadata) {
            return null;
        }
        
        return {
            streamId,
            active: stream.active,
            tracks: stream.getTracks().length,
            videoTracks: stream.getVideoTracks().length,
            metadata,
            health: {
                isHealthy: metadata.isHealthy,
                lastCheck: metadata.lastHealthCheck,
                reason: metadata.healthReason
            }
        };
    }

    /**
     * Get all active streams information
     * @returns {Array} Array of stream information
     */
    getAllStreamsInfo() {
        const streamsInfo = [];
        
        for (const streamId of this.activeStreams.keys()) {
            const info = this.getStreamInfo(streamId);
            if (info) {
                streamsInfo.push(info);
            }
        }
        
        return streamsInfo;
    }

    /**
     * Emit stream event
     * @param {string} eventName - Event name
     * @param {Object} data - Event data
     */
    emitStreamEvent(eventName, data = {}) {
        const event = new CustomEvent(`camera-stream-${eventName}`, {
            detail: { ...data, timestamp: Date.now() }
        });
        document.dispatchEvent(event);
        
        console.log(`📡 Stream event: ${eventName}`, data);
    }

    /**
     * Destroy the stream controller
     */
    destroy() {
        console.log('🧹 Destroying Camera Stream Controller...');
        
        // Stop health monitoring
        if (this.streamHealthMonitor) {
            clearInterval(this.streamHealthMonitor);
        }
        
        // Stop all streams
        for (const streamId of this.activeStreams.keys()) {
            this.stopStream(streamId, true);
        }
        
        // Clear all maps
        this.activeStreams.clear();
        this.streamConstraints.clear();
        this.streamMetadata.clear();
        this.videoElements.clear();
        this.reconnectAttempts.clear();
        
        console.log('✅ Camera Stream Controller destroyed');
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (!window.cameraStreamController) {
        window.cameraStreamController = new CameraStreamController();
    }
});

// Also initialize immediately if DOM is already loaded
if (document.readyState !== 'loading' && !window.cameraStreamController) {
    window.cameraStreamController = new CameraStreamController();
}

// Export for use
window.CameraStreamController = CameraStreamController;