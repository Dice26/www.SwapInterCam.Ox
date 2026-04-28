/**
 * React Agent Route Manager - Enhanced React Integration
 * Provides modular route definitions with component mapping and agent integration
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useAgentSystem } from '../hooks/useAgentSystem';

// Create contexts for agent routing with default values
const AgentRouteContext = createContext({
    route: null,
    agentId: null,
    routeManager: null
});

const AgentStateContext = createContext({});

/**
 * React Agent Route Manager Class
 * Handles dynamic route generation and component integration
 */
class ReactAgentRouteManager {
    constructor() {
        this.routes = new Map();
        this.componentRegistry = new Map();
        this.routeSubscriptions = new Map();
        this.agentRouteMapping = new Map();
        
        // Route generation cache
        this.routeCache = new Map();
        this.routeCacheExpiry = 300000; // 5 minutes
        
        this.initializeRouteDefinitions();
        this.initializeComponentRegistry();
    }

    /**
     * Initialize modular route definitions for React
     */
    initializeRouteDefinitions() {
        const routeDefinitions = [
            {
                path: '/chat',
                component: 'ChatManager',
                agent: 'chat-manager',
                lazy: true,
                preload: true,
                props: {
                    maxTabs: 3,
                    autoSwitch: true,
                    sessionPersistence: true
                },
                guards: ['agent-available', 'connection-healthy'],
                meta: {
                    title: 'Chat Management',
                    description: 'Multi-platform chat interface',
                    icon: 'chat',
                    category: 'communication'
                },
                children: [
                    {
                        path: '/chat/whatsapp',
                        component: 'WhatsAppTab',
                        agent: 'chat-manager',
                        props: { 
                            platform: 'whatsapp',
                            autoConnect: true,
                            notificationEnabled: true
                        },
                        meta: {
                            title: 'WhatsApp',
                            icon: 'whatsapp',
                            color: '#25D366'
                        }
                    },
                    {
                        path: '/chat/messenger',
                        component: 'MessengerTab',
                        agent: 'chat-manager',
                        props: { 
                            platform: 'messenger',
                            autoConnect: true,
                            notificationEnabled: true
                        },
                        meta: {
                            title: 'Messenger',
                            icon: 'messenger',
                            color: '#0084FF'
                        }
                    },
                    {
                        path: '/chat/line',
                        component: 'LineTab',
                        agent: 'chat-manager',
                        props: { 
                            platform: 'line',
                            autoConnect: true,
                            notificationEnabled: true
                        },
                        meta: {
                            title: 'LINE',
                            icon: 'line',
                            color: '#00B900'
                        }
                    }
                ]
            },
            {
                path: '/face-swap',
                component: 'FaceSwapControls',
                agent: 'face-swap-agent',
                lazy: true,
                preload: false,
                props: {
                    targetFPS: 16,
                    qualityLevel: 'high',
                    realTimePreview: true,
                    autoOptimize: true
                },
                guards: ['agent-available', 'gpu-available'],
                meta: {
                    title: 'Face Swap',
                    description: 'Real-time face swapping controls',
                    icon: 'face-swap',
                    category: 'processing'
                },
                children: [
                    {
                        path: '/face-swap/controls',
                        component: 'FaceSwapControlPanel',
                        agent: 'face-swap-agent',
                        props: {
                            showAdvanced: true,
                            realTimeAdjustment: true
                        },
                        meta: {
                            title: 'Controls',
                            icon: 'controls'
                        }
                    },
                    {
                        path: '/face-swap/preview',
                        component: 'FaceSwapPreview',
                        agent: 'face-swap-agent',
                        props: {
                            showMetrics: true,
                            enableRecording: true
                        },
                        meta: {
                            title: 'Preview',
                            icon: 'preview'
                        }
                    },
                    {
                        path: '/face-swap/settings',
                        component: 'FaceSwapSettings',
                        agent: 'face-swap-agent',
                        props: {
                            showPerformanceSettings: true,
                            allowQualityOverride: true
                        },
                        meta: {
                            title: 'Settings',
                            icon: 'settings'
                        }
                    }
                ]
            },
            {
                path: '/obs',
                component: 'OBSIntegration',
                agent: 'obs-integration-agent',
                lazy: true,
                preload: false,
                props: {
                    autoConnect: true,
                    sceneAutoSwitch: true,
                    virtualCameraEnabled: true
                },
                guards: ['agent-available', 'obs-available'],
                meta: {
                    title: 'OBS Integration',
                    description: 'OBS Studio integration and control',
                    icon: 'obs',
                    category: 'streaming'
                },
                children: [
                    {
                        path: '/obs/scenes',
                        component: 'SceneManager',
                        agent: 'obs-integration-agent',
                        props: {
                            allowSceneCreation: true,
                            showPreview: true
                        },
                        meta: {
                            title: 'Scene Manager',
                            icon: 'scenes'
                        }
                    },
                    {
                        path: '/obs/virtual-camera',
                        component: 'VirtualCameraControls',
                        agent: 'obs-integration-agent',
                        props: {
                            showAdvancedSettings: true,
                            enableAutoStart: true
                        },
                        meta: {
                            title: 'Virtual Camera',
                            icon: 'camera'
                        }
                    },
                    {
                        path: '/obs/streaming',
                        component: 'StreamingControls',
                        agent: 'obs-integration-agent',
                        props: {
                            showStreamKey: false,
                            enableAutoRecord: true
                        },
                        meta: {
                            title: 'Streaming',
                            icon: 'stream'
                        }
                    }
                ]
            },
            {
                path: '/settings',
                component: 'SettingsPanel',
                agent: 'ui-management-agent',
                lazy: false,
                preload: true,
                props: {
                    securityLevel: 'high',
                    privacyMode: true,
                    allowThemeChange: true
                },
                guards: ['agent-available'],
                meta: {
                    title: 'Settings',
                    description: 'Application settings and preferences',
                    icon: 'settings',
                    category: 'system'
                },
                children: [
                    {
                        path: '/settings/general',
                        component: 'GeneralSettings',
                        agent: 'ui-management-agent',
                        meta: { title: 'General', icon: 'general' }
                    },
                    {
                        path: '/settings/performance',
                        component: 'PerformanceSettings',
                        agent: 'performance-monitor',
                        meta: { title: 'Performance', icon: 'performance' }
                    },
                    {
                        path: '/settings/security',
                        component: 'SecuritySettings',
                        agent: 'security-agent',
                        meta: { title: 'Security', icon: 'security' }
                    }
                ]
            },
            {
                path: '/performance',
                component: 'PerformanceMonitor',
                agent: 'performance-monitor',
                lazy: true,
                preload: false,
                props: {
                    realTimeMetrics: true,
                    showDetailedStats: true,
                    alertThresholds: {
                        cpu: 80,
                        memory: 75,
                        fps: 15,
                        responseTime: 1000
                    }
                },
                guards: ['agent-available'],
                meta: {
                    title: 'Performance Monitor',
                    description: 'System performance monitoring and optimization',
                    icon: 'performance',
                    category: 'system'
                }
            },
            {
                path: '/diagnostics',
                component: 'DiagnosticsPanel',
                agent: 'performance-monitor',
                lazy: true,
                preload: false,
                props: {
                    showLogs: true,
                    enableExport: true,
                    autoRefresh: true
                },
                guards: ['agent-available', 'debug-mode'],
                meta: {
                    title: 'Diagnostics',
                    description: 'System diagnostics and troubleshooting',
                    icon: 'diagnostics',
                    category: 'debug'
                }
            }
        ];

        // Register routes and build mapping
        routeDefinitions.forEach(route => {
            this.registerRoute(route);
            this.buildAgentRouteMapping(route);
        });

        console.log('🛣️ React route definitions initialized:', this.routes.size, 'routes');
    }

    /**
     * Initialize component registry for dynamic loading
     */
    initializeComponentRegistry() {
        // Register component loaders for lazy loading with fallbacks
        this.componentRegistry.set('ChatManager', () => 
            import('./examples/agent-integrated-component').then(m => ({ default: m.ChatManager }))
                .catch(() => import('./chat/ChatManager').catch(() => ({ default: this.createFallbackComponent('ChatManager') })))
        );
        
        this.componentRegistry.set('WhatsAppTab', () => 
            import('./chat/WhatsAppTab').catch(() => ({ default: this.createFallbackComponent('WhatsAppTab') }))
        );
        
        this.componentRegistry.set('MessengerTab', () => 
            import('./chat/MessengerTab').catch(() => ({ default: this.createFallbackComponent('MessengerTab') }))
        );
        
        this.componentRegistry.set('LineTab', () => 
            import('./chat/LineTab').catch(() => ({ default: this.createFallbackComponent('LineTab') }))
        );
        
        this.componentRegistry.set('FaceSwapControls', () => 
            import('./examples/agent-integrated-component').then(m => ({ default: m.FaceSwapControls }))
                .catch(() => import('./face-swap/FaceSwapControls').catch(() => ({ default: this.createFallbackComponent('FaceSwapControls') })))
        );
        
        this.componentRegistry.set('FaceSwapControlPanel', () => 
            import('./face-swap/FaceSwapControlPanel').catch(() => ({ default: this.createFallbackComponent('FaceSwapControlPanel') }))
        );
        
        this.componentRegistry.set('FaceSwapPreview', () => 
            import('./face-swap/FaceSwapPreview').catch(() => ({ default: this.createFallbackComponent('FaceSwapPreview') }))
        );
        
        this.componentRegistry.set('FaceSwapSettings', () => 
            import('./face-swap/FaceSwapSettings').catch(() => ({ default: this.createFallbackComponent('FaceSwapSettings') }))
        );
        
        this.componentRegistry.set('OBSIntegration', () => 
            import('./obs/OBSIntegration').catch(() => ({ default: this.createFallbackComponent('OBSIntegration') }))
        );
        
        this.componentRegistry.set('SceneManager', () => 
            import('./obs/SceneManager').catch(() => ({ default: this.createFallbackComponent('SceneManager') }))
        );
        
        this.componentRegistry.set('VirtualCameraControls', () => 
            import('./obs/VirtualCameraControls').catch(() => ({ default: this.createFallbackComponent('VirtualCameraControls') }))
        );
        
        this.componentRegistry.set('StreamingControls', () => 
            import('./obs/StreamingControls').catch(() => ({ default: this.createFallbackComponent('StreamingControls') }))
        );
        
        this.componentRegistry.set('SettingsPanel', () => 
            import('./settings/SettingsPanel').catch(() => ({ default: this.createFallbackComponent('SettingsPanel') }))
        );
        
        this.componentRegistry.set('GeneralSettings', () => 
            import('./settings/GeneralSettings').catch(() => ({ default: this.createFallbackComponent('GeneralSettings') }))
        );
        
        this.componentRegistry.set('PerformanceSettings', () => 
            import('./settings/PerformanceSettings').catch(() => ({ default: this.createFallbackComponent('PerformanceSettings') }))
        );
        
        this.componentRegistry.set('SecuritySettings', () => 
            import('./settings/SecuritySettings').catch(() => ({ default: this.createFallbackComponent('SecuritySettings') }))
        );
        
        this.componentRegistry.set('PerformanceMonitor', () => 
            import('./performance/PerformanceMonitor').catch(() => ({ default: this.createFallbackComponent('PerformanceMonitor') }))
        );
        
        this.componentRegistry.set('DiagnosticsPanel', () => 
            import('./diagnostics/DiagnosticsPanel').catch(() => ({ default: this.createFallbackComponent('DiagnosticsPanel') }))
        );

        console.log('📦 Component registry initialized:', this.componentRegistry.size, 'components');
    }

    /**
     * Create fallback component for missing components
     */
    createFallbackComponent(componentName) {
        return function FallbackComponent(props) {
            return React.createElement('div', {
                style: {
                    padding: '20px',
                    border: '2px dashed #ccc',
                    borderRadius: '8px',
                    textAlign: 'center',
                    color: '#666'
                }
            }, [
                React.createElement('h3', { key: 'title' }, `${componentName} Component`),
                React.createElement('p', { key: 'message' }, 'This component is not yet implemented.'),
                React.createElement('div', { key: 'props', style: { fontSize: '12px', marginTop: '10px' } }, 
                    `Props: ${JSON.stringify(props, null, 2)}`
                )
            ]);
        };
    }

    /**
     * Register a route with enhanced metadata
     */
    registerRoute(routeConfig) {
        const route = {
            ...routeConfig,
            id: this.generateRouteId(routeConfig.path),
            registeredAt: Date.now(),
            accessCount: 0,
            lastAccessed: null,
            loadCount: 0,
            errorCount: 0,
            averageLoadTime: 0
        };

        this.routes.set(routeConfig.path, route);

        // Register child routes
        if (routeConfig.children) {
            routeConfig.children.forEach(childRoute => {
                this.registerRoute({
                    ...childRoute,
                    parent: routeConfig.path,
                    parentAgent: routeConfig.agent
                });
            });
        }

        console.log(`🛣️ Route registered: ${routeConfig.path} -> ${routeConfig.component} (${routeConfig.agent})`);
    }

    /**
     * Build agent to route mapping for efficient lookups
     */
    buildAgentRouteMapping(route) {
        const agentId = route.agent;
        if (!this.agentRouteMapping.has(agentId)) {
            this.agentRouteMapping.set(agentId, []);
        }
        
        this.agentRouteMapping.get(agentId).push({
            path: route.path,
            component: route.component,
            meta: route.meta || {}
        });

        // Map child routes
        if (route.children) {
            route.children.forEach(child => {
                this.buildAgentRouteMapping(child);
            });
        }
    }

    /**
     * Generate unique route ID
     */
    generateRouteId(path) {
        return path.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    }

    /**
     * Get route configuration with agent integration
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
     * Get routes by agent
     */
    getRoutesByAgent(agentId) {
        return this.agentRouteMapping.get(agentId) || [];
    }

    /**
     * Generate React Router configuration
     */
    generateReactRouterConfig() {
        const cacheKey = 'router_config';
        const cached = this.routeCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < this.routeCacheExpiry) {
            return cached.config;
        }

        const routes = Array.from(this.routes.values())
            .filter(route => !route.parent) // Only top-level routes
            .map(route => this.buildRouteConfig(route));

        const config = {
            routes,
            timestamp: Date.now(),
            version: '1.0.0'
        };

        this.routeCache.set(cacheKey, { config, timestamp: Date.now() });
        return config;
    }

    /**
     * Build individual route configuration for React Router
     */
    buildRouteConfig(route) {
        const config = {
            path: route.path,
            element: this.createRouteElement(route),
            meta: route.meta || {},
            guards: route.guards || [],
            preload: route.preload || false
        };

        // Add child routes
        if (route.children) {
            config.children = route.children.map(child => 
                this.buildRouteConfig(this.routes.get(child.path))
            ).filter(Boolean);
        }

        return config;
    }

    /**
     * Create route element with agent integration
     */
    createRouteElement(route) {
        return React.createElement(AgentRouteWrapper, {
            route,
            componentName: route.component,
            agentId: route.agent,
            routeManager: this
        });
    }

    /**
     * Load component dynamically
     */
    async loadComponent(componentName) {
        const startTime = Date.now();
        
        try {
            const loader = this.componentRegistry.get(componentName);
            if (!loader) {
                throw new Error(`Component not found: ${componentName}`);
            }

            const module = await loader();
            const loadTime = Date.now() - startTime;
            
            // Update load statistics
            this.updateLoadStatistics(componentName, loadTime, true);
            
            return module.default || module;
            
        } catch (error) {
            const loadTime = Date.now() - startTime;
            this.updateLoadStatistics(componentName, loadTime, false);
            
            console.error(`❌ Failed to load component ${componentName}:`, error);
            throw error;
        }
    }

    /**
     * Update component load statistics
     */
    updateLoadStatistics(componentName, loadTime, success) {
        // Find routes using this component
        for (const [path, route] of this.routes.entries()) {
            if (route.component === componentName) {
                route.loadCount++;
                if (!success) {
                    route.errorCount++;
                }
                
                // Update average load time
                const totalLoadTime = (route.averageLoadTime * (route.loadCount - 1)) + loadTime;
                route.averageLoadTime = totalLoadTime / route.loadCount;
            }
        }
    }

    /**
     * Check route guards
     */
    async checkRouteGuards(guards, agentId) {
        const guardResults = await Promise.all(
            guards.map(guard => this.evaluateGuard(guard, agentId))
        );
        
        return guardResults.every(result => result === true);
    }

    /**
     * Evaluate individual guard
     */
    async evaluateGuard(guard, agentId) {
        switch (guard) {
            case 'agent-available':
                return await this.isAgentAvailable(agentId);
            
            case 'connection-healthy':
                return await this.isConnectionHealthy();
            
            case 'gpu-available':
                return await this.isGPUAvailable();
            
            case 'obs-available':
                return await this.isOBSAvailable();
            
            case 'debug-mode':
                return process.env.NODE_ENV === 'development';
            
            default:
                console.warn(`Unknown guard: ${guard}`);
                return true;
        }
    }

    /**
     * Check if agent is available
     */
    async isAgentAvailable(agentId) {
        try {
            if (window.agentIPCClient) {
                const status = await window.agentIPCClient.getAgentStatus(agentId);
                return status && status.state === 'active';
            }
            return false;
        } catch (error) {
            console.warn(`Guard check failed for agent ${agentId}:`, error);
            return false;
        }
    }

    /**
     * Check connection health
     */
    async isConnectionHealthy() {
        try {
            if (window.agentIPCClient) {
                const stats = window.agentIPCClient.getConnectionStatistics();
                return stats.connected && stats.connectionHealth === 'healthy';
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Check GPU availability
     */
    async isGPUAvailable() {
        try {
            // Check if WebGL is available as a proxy for GPU
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        } catch (error) {
            return false;
        }
    }

    /**
     * Check OBS availability
     */
    async isOBSAvailable() {
        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.invoke('obs:getStatus');
                return result.success && result.connected;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get route performance metrics
     */
    getRouteMetrics() {
        const routes = Array.from(this.routes.values());
        
        return {
            totalRoutes: routes.length,
            accessedRoutes: routes.filter(r => r.accessCount > 0).length,
            averageLoadTime: this.calculateAverageLoadTime(routes),
            errorRate: this.calculateErrorRate(routes),
            mostAccessedRoute: this.getMostAccessedRoute(routes),
            slowestRoute: this.getSlowestRoute(routes),
            timestamp: Date.now()
        };
    }

    /**
     * Calculate average load time across all routes
     */
    calculateAverageLoadTime(routes) {
        const routesWithLoadTime = routes.filter(r => r.averageLoadTime > 0);
        if (routesWithLoadTime.length === 0) return 0;
        
        const totalLoadTime = routesWithLoadTime.reduce((sum, r) => sum + r.averageLoadTime, 0);
        return totalLoadTime / routesWithLoadTime.length;
    }

    /**
     * Calculate error rate across all routes
     */
    calculateErrorRate(routes) {
        const totalLoads = routes.reduce((sum, r) => sum + r.loadCount, 0);
        const totalErrors = routes.reduce((sum, r) => sum + r.errorCount, 0);
        
        return totalLoads > 0 ? (totalErrors / totalLoads) * 100 : 0;
    }

    /**
     * Get most accessed route
     */
    getMostAccessedRoute(routes) {
        return routes.reduce((max, route) => 
            route.accessCount > (max?.accessCount || 0) ? route : max, null
        );
    }

    /**
     * Get slowest loading route
     */
    getSlowestRoute(routes) {
        return routes.reduce((max, route) => 
            route.averageLoadTime > (max?.averageLoadTime || 0) ? route : max, null
        );
    }

    /**
     * Clear route cache
     */
    clearRouteCache() {
        this.routeCache.clear();
        console.log('🧹 Route cache cleared');
    }

    /**
     * Preload components for better performance
     */
    async preloadComponents() {
        const preloadRoutes = Array.from(this.routes.values())
            .filter(route => route.preload);

        const preloadPromises = preloadRoutes.map(async (route) => {
            try {
                await this.loadComponent(route.component);
                console.log(`✅ Preloaded component: ${route.component}`);
            } catch (error) {
                console.warn(`⚠️ Failed to preload component: ${route.component}`, error);
            }
        });

        await Promise.allSettled(preloadPromises);
        console.log(`🚀 Preloaded ${preloadRoutes.length} components`);
    }
}

// Create singleton instance
const reactAgentRouteManager = new ReactAgentRouteManager();

export default reactAgentRouteManager;/**
 * Agen
t Route Wrapper Component
 * Wraps route components with agent integration and state management
 */
const AgentRouteWrapper = ({ route, componentName, agentId, routeManager }) => {
    const [Component, setComponent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [guardsChecked, setGuardsChecked] = useState(false);
    const [guardsPassed, setGuardsPassed] = useState(false);
    
    const { 
        dispatch, 
        agentStates, 
        connected, 
        error: systemError 
    } = useAgentSystem();

    // Load component on mount
    useEffect(() => {
        let mounted = true;

        const loadComponent = async () => {
            try {
                setLoading(true);
                setError(null);

                // Check route guards first
                if (route.guards && route.guards.length > 0) {
                    const guardsPass = await routeManager.checkRouteGuards(route.guards, agentId);
                    setGuardsPassed(guardsPass);
                    setGuardsChecked(true);

                    if (!guardsPass) {
                        setLoading(false);
                        return;
                    }
                } else {
                    setGuardsPassed(true);
                    setGuardsChecked(true);
                }

                // Load the component
                const LoadedComponent = await routeManager.loadComponent(componentName);
                
                if (mounted) {
                    setComponent(() => LoadedComponent);
                    setLoading(false);
                }
            } catch (err) {
                if (mounted) {
                    setError(err);
                    setLoading(false);
                }
            }
        };

        loadComponent();

        return () => {
            mounted = false;
        };
    }, [route, componentName, agentId, routeManager]);

    // Create enhanced props with agent integration
    const enhancedProps = useMemo(() => {
        if (!Component) return {};

        const agentState = agentStates[agentId] || {};
        
        return {
            ...route.props,
            
            // Agent integration
            agentId,
            agentState,
            connected,
            
            // Agent actions
            dispatch: (action, payload) => dispatch(`${agentId}/${action}`, payload),
            updateAgentState: (stateUpdate) => dispatch(`${agentId}/updateState`, stateUpdate),
            
            // Route metadata
            routePath: route.path,
            routeMeta: route.meta,
            
            // System state
            systemError,
            
            // Performance tracking
            onRouteAccess: () => routeManager.getRoute(route.path),
            
            // Component lifecycle hooks
            onComponentMount: () => {
                console.log(`📍 Component mounted: ${componentName} (${route.path})`);
            },
            onComponentUnmount: () => {
                console.log(`📍 Component unmounted: ${componentName} (${route.path})`);
            }
        };
    }, [Component, route, agentId, agentStates, connected, dispatch, systemError, routeManager, componentName]);

    // Loading state
    if (loading) {
        return (
            <div className="agent-route-loading">
                <div className="loading-spinner" />
                <div className="loading-text">
                    Loading {route.meta?.title || componentName}...
                </div>
            </div>
        );
    }

    // Guard check failed
    if (guardsChecked && !guardsPassed) {
        return (
            <div className="agent-route-guard-failed">
                <div className="guard-failed-icon">🚫</div>
                <div className="guard-failed-title">Access Restricted</div>
                <div className="guard-failed-message">
                    {route.meta?.title || componentName} is not available right now.
                </div>
                <div className="guard-failed-details">
                    Required conditions: {route.guards?.join(', ')}
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="agent-route-error">
                <div className="error-icon">❌</div>
                <div className="error-title">Failed to Load Component</div>
                <div className="error-message">{error.message}</div>
                <button 
                    className="error-retry-button"
                    onClick={() => window.location.reload()}
                >
                    Retry
                </button>
            </div>
        );
    }

    // Render component with enhanced props
    if (Component) {
        return (
            <AgentRouteContext.Provider value={{ route, agentId, routeManager }}>
                <AgentStateContext.Provider value={agentStates[agentId] || {}}>
                    <Component {...enhancedProps} />
                </AgentStateContext.Provider>
            </AgentRouteContext.Provider>
        );
    }

    return null;
};

/**
 * Hook to access route context
 */
export const useAgentRoute = () => {
    const context = useContext(AgentRouteContext);
    if (!context) {
        throw new Error('useAgentRoute must be used within an AgentRouteWrapper');
    }
    return context;
};

/**
 * Hook to access agent state context
 */
export const useAgentRouteState = () => {
    const context = useContext(AgentStateContext);
    if (!context) {
        throw new Error('useAgentRouteState must be used within an AgentRouteWrapper');
    }
    return context;
};

/**
 * Higher-Order Component for agent integration
 */
export const withAgentIntegration = (WrappedComponent, agentId) => {
    return React.forwardRef((props, ref) => {
        const { dispatch, agentStates, connected } = useAgentSystem();
        const agentState = agentStates[agentId] || {};

        const enhancedProps = {
            ...props,
            ref,
            agentId,
            agentState,
            connected,
            dispatch: (action, payload) => dispatch(`${agentId}/${action}`, payload),
            updateAgentState: (stateUpdate) => dispatch(`${agentId}/updateState`, stateUpdate)
        };

        return <WrappedComponent {...enhancedProps} />;
    });
};

/**
 * Route Navigation Hook with Agent Integration
 */
export const useAgentNavigation = () => {
    const { dispatch } = useAgentSystem();
    
    const navigateWithAgent = useCallback(async (path, agentId, options = {}) => {
        try {
            // Notify agent of navigation
            if (agentId) {
                await dispatch(`${agentId}/navigate`, { path, options });
            }
            
            // Perform navigation (assuming React Router is available)
            if (window.history) {
                window.history.pushState(null, '', path);
            }
            
            return true;
        } catch (error) {
            console.error('Navigation failed:', error);
            return false;
        }
    }, [dispatch]);

    const navigateBack = useCallback(() => {
        if (window.history) {
            window.history.back();
        }
    }, []);

    const navigateForward = useCallback(() => {
        if (window.history) {
            window.history.forward();
        }
    }, []);

    return {
        navigateWithAgent,
        navigateBack,
        navigateForward
    };
};

/**
 * Route Performance Hook
 */
export const useRoutePerformance = () => {
    const [metrics, setMetrics] = useState(null);
    
    const refreshMetrics = useCallback(() => {
        const routeMetrics = reactAgentRouteManager.getRouteMetrics();
        setMetrics(routeMetrics);
    }, []);

    useEffect(() => {
        refreshMetrics();
        
        // Auto-refresh every 30 seconds
        const interval = setInterval(refreshMetrics, 30000);
        return () => clearInterval(interval);
    }, [refreshMetrics]);

    return {
        metrics,
        refreshMetrics,
        clearCache: () => reactAgentRouteManager.clearRouteCache()
    };
};

/**
 * Component Preloader Hook
 */
export const useComponentPreloader = () => {
    const [preloadStatus, setPreloadStatus] = useState({
        loading: false,
        completed: false,
        error: null
    });

    const preloadComponents = useCallback(async () => {
        setPreloadStatus({ loading: true, completed: false, error: null });
        
        try {
            await reactAgentRouteManager.preloadComponents();
            setPreloadStatus({ loading: false, completed: true, error: null });
        } catch (error) {
            setPreloadStatus({ loading: false, completed: false, error });
        }
    }, []);

    return {
        preloadStatus,
        preloadComponents
    };
};