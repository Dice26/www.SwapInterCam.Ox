/**
 * Agent Route Manager - React Component for Dynamic Agent-Driven UI
 * Handles modular routing and agent-driven prompts in the renderer process
 * Enhanced with automatic retry logic and state synchronization
 */

class AgentRouteManager {
    constructor() {
        this.routes = new Map();
        this.agentContexts = new Map();
        this.activePrompts = new Map();
        this.componentRegistry = new Map();
        
        // Enhanced communication features
        this.communicationStats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            retriedRequests: 0,
            averageResponseTime: 0
        };
        
        this.retryConfig = {
            maxRetries: 3,
            baseDelay: 1000,
            backoffFactor: 2,
            retryableErrors: ['timeout', 'connection_lost', 'service_unavailable']
        };
        
        this.stateSync = {
            enabled: true,
            syncInterval: 5000,
            lastSync: null,
            pendingSync: false
        };
        
        this.initializeRoutes();
        this.initializeAgentContexts();
        this.initializeEnhancedCommunication();
    }

    /**
     * Initialize modular route definitions
     */
    initializeRoutes() {
        const routeDefinitions = [
            {
                path: '/chat',
                component: 'ChatManager',
                agent: 'chat-manager',
                props: {
                    maxTabs: 3,
                    autoSwitch: true,
                    sessionPersistence: true
                },
                children: [
                    {
                        path: '/chat/whatsapp',
                        component: 'WhatsAppTab',
                        agent: 'chat-manager',
                        props: { platform: 'whatsapp' }
                    },
                    {
                        path: '/chat/messenger',
                        component: 'MessengerTab',
                        agent: 'chat-manager',
                        props: { platform: 'messenger' }
                    },
                    {
                        path: '/chat/line',
                        component: 'LineTab',
                        agent: 'chat-manager',
                        props: { platform: 'line' }
                    }
                ]
            },
            {
                path: '/face-swap',
                component: 'FaceSwapControls',
                agent: 'face-swap-agent',
                props: {
                    targetFPS: 16,
                    qualityLevel: 'high',
                    realTimePreview: true
                },
                children: [
                    {
                        path: '/face-swap/controls',
                        component: 'FaceSwapControlPanel',
                        agent: 'face-swap-agent'
                    },
                    {
                        path: '/face-swap/preview',
                        component: 'FaceSwapPreview',
                        agent: 'face-swap-agent'
                    }
                ]
            },
            {
                path: '/obs',
                component: 'OBSIntegration',
                agent: 'obs-integration-agent',
                props: {
                    autoConnect: true,
                    sceneAutoSwitch: true
                },
                children: [
                    {
                        path: '/obs/scenes',
                        component: 'SceneManager',
                        agent: 'obs-integration-agent'
                    },
                    {
                        path: '/obs/virtual-camera',
                        component: 'VirtualCameraControls',
                        agent: 'obs-integration-agent'
                    }
                ]
            },
            {
                path: '/settings',
                component: 'SettingsPanel',
                agent: 'security-agent',
                props: {
                    securityLevel: 'high',
                    privacyMode: true
                }
            },
            {
                path: '/performance',
                component: 'PerformanceMonitor',
                agent: 'performance-monitor',
                props: {
                    realTimeMetrics: true,
                    alertThresholds: {
                        cpu: 80,
                        memory: 75,
                        fps: 15
                    }
                }
            }
        ];

        routeDefinitions.forEach(route => {
            this.registerRoute(route);
        });
    }

    /**
     * Initialize agent contexts for dynamic prompts
     */
    initializeAgentContexts() {
        const agentContexts = {
            'chat-manager': {
                prompts: {
                    switchTab: {
                        type: 'action',
                        message: 'Switch to {platform} tab',
                        confirmRequired: false,
                        animation: 'slide'
                    },
                    sessionRestore: {
                        type: 'confirmation',
                        message: 'Restore previous session for {platform}?',
                        confirmRequired: true,
                        timeout: 5000
                    },
                    notificationAlert: {
                        type: 'notification',
                        message: 'New message in {platform}',
                        duration: 3000,
                        priority: 'medium'
                    }
                },
                state: {
                    activeTabs: [],
                    currentTab: null,
                    sessionData: {}
                }
            },
            'face-swap-agent': {
                prompts: {
                    qualityAdjust: {
                        type: 'slider',
                        message: 'Adjust face-swap quality',
                        min: 1,
                        max: 10,
                        default: 7
                    },
                    performanceWarning: {
                        type: 'warning',
                        message: 'Performance below target FPS. Reduce quality?',
                        confirmRequired: true,
                        autoAction: 'reduce_quality'
                    },
                    processingStatus: {
                        type: 'status',
                        message: 'Processing at {fps} FPS',
                        realTime: true
                    }
                },
                state: {
                    currentFPS: 0,
                    qualityLevel: 7,
                    isProcessing: false
                }
            },
            'obs-integration-agent': {
                prompts: {
                    sceneSwitch: {
                        type: 'action',
                        message: 'Switching to {sceneName} scene',
                        confirmRequired: false,
                        animation: 'fade'
                    },
                    connectionLost: {
                        type: 'error',
                        message: 'OBS connection lost. Attempting to reconnect...',
                        autoRetry: true,
                        retryInterval: 5000
                    },
                    virtualCameraToggle: {
                        type: 'toggle',
                        message: 'Virtual Camera {status}',
                        states: ['enabled', 'disabled']
                    }
                },
                state: {
                    connected: false,
                    currentScene: null,
                    virtualCameraActive: false
                }
            }
        };

        Object.entries(agentContexts).forEach(([agentId, context]) => {
            this.agentContexts.set(agentId, context);
        });
    }

    /**
     * Register a route with the manager
     */
    registerRoute(routeConfig) {
        const route = {
            ...routeConfig,
            registeredAt: Date.now(),
            accessCount: 0,
            lastAccessed: null
        };

        this.routes.set(routeConfig.path, route);

        // Register child routes
        if (routeConfig.children) {
            routeConfig.children.forEach(childRoute => {
                this.registerRoute({
                    ...childRoute,
                    parent: routeConfig.path
                });
            });
        }

        console.log(`🛣️ Route registered: ${routeConfig.path} -> ${routeConfig.component}`);
    }

    /**
     * Get route configuration for a path
     */
    getRoute(path) {
        const route = this.routes.get(path);
        if (route) {
            route.accessCount++;
            route.lastAccessed = Date.now();
        }
        return route;
    }

    /**
     * Create dynamic agent-driven prompt
     */
    createAgentPrompt(agentId, promptType, context = {}) {
        const agentContext = this.agentContexts.get(agentId);
        if (!agentContext || !agentContext.prompts[promptType]) {
            console.warn(`Unknown agent or prompt: ${agentId}.${promptType}`);
            return null;
        }

        const promptTemplate = agentContext.prompts[promptType];
        const promptId = `${agentId}-${promptType}-${Date.now()}`;

        const prompt = {
            id: promptId,
            agentId,
            type: promptTemplate.type,
            message: this.interpolateMessage(promptTemplate.message, context),
            ...promptTemplate,
            context,
            createdAt: Date.now(),
            status: 'active'
        };

        this.activePrompts.set(promptId, prompt);

        // Auto-expire prompts with timeout
        if (promptTemplate.timeout) {
            setTimeout(() => {
                this.expirePrompt(promptId);
            }, promptTemplate.timeout);
        }

        return prompt;
    }

    /**
     * Interpolate message with context variables
     */
    interpolateMessage(message, context) {
        return message.replace(/\{(\w+)\}/g, (match, key) => {
            return context[key] || match;
        });
    }

    /**
     * Update agent state
     */
    updateAgentState(agentId, stateUpdate) {
        const agentContext = this.agentContexts.get(agentId);
        if (agentContext) {
            agentContext.state = {
                ...agentContext.state,
                ...stateUpdate,
                lastUpdated: Date.now()
            };
            
            // Emit state change event
            this.emitStateChange(agentId, agentContext.state);
        }
    }

    /**
     * Get agent state
     */
    getAgentState(agentId) {
        const agentContext = this.agentContexts.get(agentId);
        return agentContext ? agentContext.state : null;
    }

    /**
     * Handle prompt response
     */
    handlePromptResponse(promptId, response) {
        const prompt = this.activePrompts.get(promptId);
        if (!prompt) {
            console.warn(`Prompt not found: ${promptId}`);
            return;
        }

        prompt.response = response;
        prompt.respondedAt = Date.now();
        prompt.status = 'completed';

        // Execute auto-action if defined
        if (prompt.autoAction && response.confirmed) {
            this.executeAutoAction(prompt.agentId, prompt.autoAction, prompt.context);
        }

        // Clean up completed prompt
        setTimeout(() => {
            this.activePrompts.delete(promptId);
        }, 1000);

        return prompt;
    }

    /**
     * Initialize enhanced communication features
     */
    initializeEnhancedCommunication() {
        // Setup automatic state synchronization
        if (this.stateSync.enabled) {
            this.stateSyncInterval = setInterval(() => {
                this.performStateSync();
            }, this.stateSync.syncInterval);
        }
        
        // Setup periodic cleanup
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 60000); // Every minute
        
        console.log('🔧 Enhanced communication features initialized');
    }

    /**
     * Execute auto-action for agent with retry logic
     */
    async executeAutoAction(agentId, action, context) {
        console.log(`🤖 Executing auto-action: ${agentId}.${action}`, context);
        
        const startTime = Date.now();
        this.communicationStats.totalRequests++;
        
        try {
            const result = await this.executeWithRetry(async () => {
                // Use enhanced IPC client if available
                if (window.agentIPCClient) {
                    return await window.agentIPCClient.dispatch(`agent/${agentId}/${action}`, context);
                }
                
                // Fallback to direct electron API
                if (window.electronAPI) {
                    return await window.electronAPI.dispatchAgentAction({
                        agentId,
                        action,
                        context,
                        timestamp: Date.now()
                    });
                }
                
                throw new Error('No communication method available');
            }, `${agentId}.${action}`);
            
            // Update success statistics
            this.communicationStats.successfulRequests++;
            this.updateAverageResponseTime(Date.now() - startTime);
            
            return result;
            
        } catch (error) {
            console.error(`❌ Auto-action failed: ${agentId}.${action}`, error);
            this.communicationStats.failedRequests++;
            throw error;
        }
    }

    /**
     * Execute function with retry logic
     */
    async executeWithRetry(fn, context = '') {
        let lastError;
        
        for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = this.calculateBackoffDelay(attempt);
                    console.log(`🔄 Retry attempt ${attempt}/${this.retryConfig.maxRetries} for ${context} (delay: ${delay}ms)`);
                    await this.delay(delay);
                    this.communicationStats.retriedRequests++;
                }
                
                const result = await fn();
                
                if (attempt > 0) {
                    console.log(`✅ Retry successful for ${context} after ${attempt} attempts`);
                }
                
                return result;
                
            } catch (error) {
                lastError = error;
                
                // Don't retry if error is not retryable
                if (!this.isRetryableError(error)) {
                    console.log(`❌ Non-retryable error for ${context}: ${error.message}`);
                    break;
                }
                
                // Don't retry on last attempt
                if (attempt === this.retryConfig.maxRetries) {
                    console.log(`❌ Max retries exhausted for ${context}`);
                    break;
                }
                
                console.log(`⚠️ Attempt ${attempt + 1} failed for ${context}: ${error.message}`);
            }
        }
        
        throw lastError;
    }

    /**
     * Calculate exponential backoff delay
     */
    calculateBackoffDelay(attempt) {
        const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt - 1);
        // Add jitter to prevent thundering herd
        const jitter = delay * 0.1 * Math.random();
        return Math.round(delay + jitter);
    }

    /**
     * Check if error is retryable
     */
    isRetryableError(error) {
        const errorMessage = error.message.toLowerCase();
        return this.retryConfig.retryableErrors.some(retryableError => 
            errorMessage.includes(retryableError.toLowerCase())
        );
    }

    /**
     * Perform state synchronization
     */
    async performStateSync() {
        if (this.stateSync.pendingSync) return;
        
        this.stateSync.pendingSync = true;
        
        try {
            // Sync all agent states
            const syncPromises = Array.from(this.agentContexts.keys()).map(async (agentId) => {
                try {
                    if (window.agentIPCClient) {
                        const remoteState = await window.agentIPCClient.dispatch(`agent/${agentId}/state`);
                        if (remoteState) {
                            this.syncAgentState(agentId, remoteState);
                        }
                    }
                } catch (error) {
                    console.warn(`⚠️ State sync failed for agent ${agentId}:`, error.message);
                }
            });
            
            await Promise.allSettled(syncPromises);
            this.stateSync.lastSync = Date.now();
            
        } catch (error) {
            console.warn('⚠️ State sync error:', error);
        } finally {
            this.stateSync.pendingSync = false;
        }
    }

    /**
     * Sync agent state with remote state
     */
    syncAgentState(agentId, remoteState) {
        const agentContext = this.agentContexts.get(agentId);
        if (agentContext) {
            const localState = agentContext.state;
            const lastLocalUpdate = localState.lastUpdated || 0;
            const lastRemoteUpdate = remoteState.lastUpdated || 0;
            
            // Only sync if remote state is newer
            if (lastRemoteUpdate > lastLocalUpdate) {
                agentContext.state = {
                    ...localState,
                    ...remoteState,
                    syncedAt: Date.now()
                };
                
                this.emitStateChange(agentId, agentContext.state);
                console.log(`🔄 Synced state for agent ${agentId}`);
            }
        }
    }

    /**
     * Update average response time
     */
    updateAverageResponseTime(responseTime) {
        const totalRequests = this.communicationStats.successfulRequests;
        const currentAverage = this.communicationStats.averageResponseTime;
        
        this.communicationStats.averageResponseTime = 
            ((currentAverage * (totalRequests - 1)) + responseTime) / totalRequests;
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Expire a prompt
     */
    expirePrompt(promptId) {
        const prompt = this.activePrompts.get(promptId);
        if (prompt && prompt.status === 'active') {
            prompt.status = 'expired';
            prompt.expiredAt = Date.now();
            
            // Execute timeout action if defined
            if (prompt.timeoutAction) {
                this.executeAutoAction(prompt.agentId, prompt.timeoutAction, prompt.context);
            }
        }
    }

    /**
     * Get active prompts for an agent
     */
    getActivePrompts(agentId) {
        return Array.from(this.activePrompts.values())
            .filter(prompt => prompt.agentId === agentId && prompt.status === 'active');
    }

    /**
     * Emit state change event
     */
    emitStateChange(agentId, newState) {
        const event = new CustomEvent('agent-state-change', {
            detail: {
                agentId,
                state: newState,
                timestamp: Date.now()
            }
        });
        
        document.dispatchEvent(event);
    }

    /**
     * Create React component props with agent context
     */
    createComponentProps(routePath, additionalProps = {}) {
        const route = this.getRoute(routePath);
        if (!route) {
            return additionalProps;
        }

        const agentState = this.getAgentState(route.agent);
        const activePrompts = this.getActivePrompts(route.agent);

        return {
            ...route.props,
            ...additionalProps,
            agentId: route.agent,
            agentState,
            activePrompts,
            onPromptResponse: (promptId, response) => this.handlePromptResponse(promptId, response),
            onStateUpdate: (stateUpdate) => this.updateAgentState(route.agent, stateUpdate),
            onCreatePrompt: (promptType, context) => this.createAgentPrompt(route.agent, promptType, context)
        };
    }

    /**
     * Get enhanced performance metrics
     */
    getPerformanceMetrics() {
        const totalRoutes = this.routes.size;
        const accessedRoutes = Array.from(this.routes.values())
            .filter(route => route.accessCount > 0).length;
        
        const totalPrompts = this.activePrompts.size;
        const agentActivity = {};
        
        for (const [agentId, context] of this.agentContexts.entries()) {
            agentActivity[agentId] = {
                activePrompts: this.getActivePrompts(agentId).length,
                lastStateUpdate: context.state.lastUpdated || null,
                lastSync: context.state.syncedAt || null
            };
        }

        return {
            routes: {
                total: totalRoutes,
                accessed: accessedRoutes,
                utilization: totalRoutes > 0 ? (accessedRoutes / totalRoutes) * 100 : 0
            },
            prompts: {
                active: totalPrompts,
                byAgent: agentActivity
            },
            communication: {
                ...this.communicationStats,
                successRate: this.communicationStats.totalRequests > 0 ? 
                    (this.communicationStats.successfulRequests / this.communicationStats.totalRequests) * 100 : 0,
                retryRate: this.communicationStats.totalRequests > 0 ? 
                    (this.communicationStats.retriedRequests / this.communicationStats.totalRequests) * 100 : 0
            },
            stateSync: {
                enabled: this.stateSync.enabled,
                lastSync: this.stateSync.lastSync,
                pendingSync: this.stateSync.pendingSync,
                syncInterval: this.stateSync.syncInterval
            },
            timestamp: Date.now()
        };
    }

    /**
     * Configure retry settings
     */
    configureRetry(config) {
        this.retryConfig = {
            ...this.retryConfig,
            ...config
        };
        console.log('⚙️ Retry configuration updated:', this.retryConfig);
    }

    /**
     * Configure state synchronization
     */
    configureStateSync(config) {
        const oldInterval = this.stateSync.syncInterval;
        
        this.stateSync = {
            ...this.stateSync,
            ...config
        };
        
        // Restart sync interval if changed
        if (config.syncInterval && config.syncInterval !== oldInterval) {
            if (this.stateSyncInterval) {
                clearInterval(this.stateSyncInterval);
            }
            
            if (this.stateSync.enabled) {
                this.stateSyncInterval = setInterval(() => {
                    this.performStateSync();
                }, this.stateSync.syncInterval);
            }
        }
        
        console.log('⚙️ State sync configuration updated:', this.stateSync);
    }

    /**
     * Get communication statistics
     */
    getCommunicationStats() {
        return {
            ...this.communicationStats,
            successRate: this.communicationStats.totalRequests > 0 ? 
                (this.communicationStats.successfulRequests / this.communicationStats.totalRequests) * 100 : 0,
            retryRate: this.communicationStats.totalRequests > 0 ? 
                (this.communicationStats.retriedRequests / this.communicationStats.totalRequests) * 100 : 0,
            timestamp: Date.now()
        };
    }

    /**
     * Enhanced cleanup with communication stats reset
     */
    cleanup() {
        const now = Date.now();
        const expiredPrompts = [];

        for (const [promptId, prompt] of this.activePrompts.entries()) {
            if (prompt.status === 'expired' || 
                (now - prompt.createdAt > 300000)) { // 5 minutes
                expiredPrompts.push(promptId);
            }
        }

        expiredPrompts.forEach(promptId => {
            this.activePrompts.delete(promptId);
        });

        // Reset communication stats if they get too large
        if (this.communicationStats.totalRequests > 10000) {
            const resetStats = {
                totalRequests: Math.floor(this.communicationStats.totalRequests * 0.1),
                successfulRequests: Math.floor(this.communicationStats.successfulRequests * 0.1),
                failedRequests: Math.floor(this.communicationStats.failedRequests * 0.1),
                retriedRequests: Math.floor(this.communicationStats.retriedRequests * 0.1),
                averageResponseTime: this.communicationStats.averageResponseTime
            };
            
            this.communicationStats = resetStats;
            console.log('📊 Communication stats reset to prevent memory bloat');
        }

        console.log(`🧹 Cleaned up ${expiredPrompts.length} expired prompts`);
    }

    /**
     * Shutdown the route manager
     */
    shutdown() {
        console.log('🛑 Shutting down Agent Route Manager...');
        
        // Clear intervals
        if (this.stateSyncInterval) {
            clearInterval(this.stateSyncInterval);
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        // Clear data structures
        this.routes.clear();
        this.agentContexts.clear();
        this.activePrompts.clear();
        this.componentRegistry.clear();
        
        console.log('✅ Agent Route Manager shutdown complete');
    }
}

// Export for use in renderer process
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AgentRouteManager;
} else {
    window.AgentRouteManager = AgentRouteManager;
}