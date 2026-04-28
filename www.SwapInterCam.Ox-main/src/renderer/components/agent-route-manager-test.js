/**
 * Agent Route Manager Test Component
 * Comprehensive testing interface for React Agent Route Manager
 */

import React, { useState, useEffect } from 'react';
import reactAgentRouteManager from './react-agent-route-manager';
import { 
    useAgentNavigation, 
    useRoutePerformance, 
    useComponentPreloader 
} from './react-agent-route-manager';
import { useAgentSystem } from '../hooks/useAgentSystem';

const AgentRouteManagerTest = () => {
    const [routeConfig, setRouteConfig] = useState(null);
    const [selectedRoute, setSelectedRoute] = useState('');
    const [guardResults, setGuardResults] = useState({});
    const [componentLoadResults, setComponentLoadResults] = useState({});
    
    const { connected, agentStates } = useAgentSystem();
    const { navigateWithAgent } = useAgentNavigation();
    const { metrics, refreshMetrics, clearCache } = useRoutePerformance();
    const { preloadStatus, preloadComponents } = useComponentPreloader();

    // Load route configuration on mount
    useEffect(() => {
        const config = reactAgentRouteManager.generateReactRouterConfig();
        setRouteConfig(config);
        refreshMetrics();
    }, [refreshMetrics]);

    // Test route guards
    const testRouteGuards = async (route) => {
        if (!route.guards || route.guards.length === 0) {
            setGuardResults(prev => ({
                ...prev,
                [route.path]: { passed: true, message: 'No guards to check' }
            }));
            return;
        }

        try {
            const agentId = getAgentIdForRoute(route.path);
            const passed = await reactAgentRouteManager.checkRouteGuards(route.guards, agentId);
            
            setGuardResults(prev => ({
                ...prev,
                [route.path]: { 
                    passed, 
                    message: passed ? 'All guards passed' : 'Some guards failed',
                    guards: route.guards
                }
            }));
        } catch (error) {
            setGuardResults(prev => ({
                ...prev,
                [route.path]: { 
                    passed: false, 
                    message: `Error: ${error.message}`,
                    guards: route.guards
                }
            }));
        }
    };

    // Test component loading
    const testComponentLoading = async (route) => {
        const componentName = getComponentNameForRoute(route.path);
        if (!componentName) return;

        try {
            const startTime = Date.now();
            await reactAgentRouteManager.loadComponent(componentName);
            const loadTime = Date.now() - startTime;
            
            setComponentLoadResults(prev => ({
                ...prev,
                [route.path]: { 
                    success: true, 
                    loadTime,
                    message: `Loaded in ${loadTime}ms`
                }
            }));
        } catch (error) {
            setComponentLoadResults(prev => ({
                ...prev,
                [route.path]: { 
                    success: false, 
                    loadTime: 0,
                    message: `Failed: ${error.message}`
                }
            }));
        }
    };

    // Test navigation
    const testNavigation = async (path) => {
        try {
            const agentId = getAgentIdForRoute(path);
            const success = await navigateWithAgent(path, agentId);
            
            if (success) {
                alert(`Navigation to ${path} successful`);
            } else {
                alert(`Navigation to ${path} failed`);
            }
        } catch (error) {
            alert(`Navigation error: ${error.message}`);
        }
    };

    // Helper functions
    const getAgentIdForRoute = (path) => {
        const route = reactAgentRouteManager.getRoute(path);
        return route?.agent || 'unknown';
    };

    const getComponentNameForRoute = (path) => {
        const route = reactAgentRouteManager.getRoute(path);
        return route?.component;
    };

    const getAllRoutes = (routes, level = 0) => {
        let allRoutes = [];
        
        routes.forEach(route => {
            allRoutes.push({ ...route, level });
            if (route.children) {
                allRoutes = allRoutes.concat(getAllRoutes(route.children, level + 1));
            }
        });
        
        return allRoutes;
    };

    const formatRouteTitle = (route) => {
        const indent = '  '.repeat(route.level);
        return `${indent}${route.path} (${route.meta?.title || 'No title'})`;
    };

    const getStatusColor = (status) => {
        if (status === undefined) return '#999';
        return status ? '#4CAF50' : '#F44336';
    };

    if (!routeConfig) {
        return (
            <div style={{ padding: '20px' }}>
                <div>Loading route configuration...</div>
            </div>
        );
    }

    const allRoutes = getAllRoutes(routeConfig.routes);

    return (
        <div style={{ 
            padding: '20px', 
            fontFamily: 'Arial, sans-serif',
            maxWidth: '1200px',
            margin: '0 auto'
        }}>
            <h2>Agent Route Manager Test Interface</h2>
            
            {/* System Status */}
            <div style={{ 
                marginBottom: '20px', 
                padding: '15px', 
                border: '1px solid #ddd', 
                borderRadius: '5px',
                backgroundColor: connected ? '#E8F5E8' : '#FFE8E8'
            }}>
                <h3>System Status</h3>
                <div>Connection: {connected ? '✅ Connected' : '❌ Disconnected'}</div>
                <div>Active Agents: {Object.keys(agentStates).length}</div>
                <div>Total Routes: {allRoutes.length}</div>
            </div>

            {/* Route Selection */}
            <div style={{ marginBottom: '20px' }}>
                <h3>Route Selection</h3>
                <select 
                    value={selectedRoute}
                    onChange={(e) => setSelectedRoute(e.target.value)}
                    style={{ 
                        width: '100%', 
                        padding: '8px', 
                        marginBottom: '10px',
                        fontFamily: 'monospace'
                    }}
                >
                    <option value="">Select a route to test...</option>
                    {allRoutes.map(route => (
                        <option key={route.path} value={route.path}>
                            {formatRouteTitle(route)}
                        </option>
                    ))}
                </select>
                
                {selectedRoute && (
                    <div style={{ 
                        padding: '10px', 
                        backgroundColor: '#f5f5f5', 
                        borderRadius: '5px',
                        marginTop: '10px'
                    }}>
                        <strong>Selected Route:</strong> {selectedRoute}<br/>
                        <strong>Agent:</strong> {getAgentIdForRoute(selectedRoute)}<br/>
                        <strong>Component:</strong> {getComponentNameForRoute(selectedRoute)}
                    </div>
                )}
            </div>

            {/* Test Actions */}
            <div style={{ marginBottom: '20px' }}>
                <h3>Test Actions</h3>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => selectedRoute && testRouteGuards(reactAgentRouteManager.getRoute(selectedRoute))}
                        disabled={!selectedRoute}
                        style={{ 
                            padding: '8px 16px', 
                            backgroundColor: '#2196F3', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px',
                            cursor: selectedRoute ? 'pointer' : 'not-allowed'
                        }}
                    >
                        Test Route Guards
                    </button>
                    
                    <button
                        onClick={() => selectedRoute && testComponentLoading(reactAgentRouteManager.getRoute(selectedRoute))}
                        disabled={!selectedRoute}
                        style={{ 
                            padding: '8px 16px', 
                            backgroundColor: '#FF9800', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px',
                            cursor: selectedRoute ? 'pointer' : 'not-allowed'
                        }}
                    >
                        Test Component Loading
                    </button>
                    
                    <button
                        onClick={() => selectedRoute && testNavigation(selectedRoute)}
                        disabled={!selectedRoute}
                        style={{ 
                            padding: '8px 16px', 
                            backgroundColor: '#4CAF50', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px',
                            cursor: selectedRoute ? 'pointer' : 'not-allowed'
                        }}
                    >
                        Test Navigation
                    </button>
                    
                    <button
                        onClick={preloadComponents}
                        disabled={preloadStatus.loading}
                        style={{ 
                            padding: '8px 16px', 
                            backgroundColor: '#9C27B0', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px',
                            cursor: preloadStatus.loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {preloadStatus.loading ? 'Preloading...' : 'Preload Components'}
                    </button>
                    
                    <button
                        onClick={clearCache}
                        style={{ 
                            padding: '8px 16px', 
                            backgroundColor: '#607D8B', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Clear Cache
                    </button>
                    
                    <button
                        onClick={refreshMetrics}
                        style={{ 
                            padding: '8px 16px', 
                            backgroundColor: '#795548', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Refresh Metrics
                    </button>
                </div>
            </div>

            {/* Performance Metrics */}
            {metrics && (
                <div style={{ marginBottom: '20px' }}>
                    <h3>Performance Metrics</h3>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                        gap: '15px' 
                    }}>
                        <div style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}>
                            <div style={{ fontWeight: 'bold' }}>Total Routes</div>
                            <div style={{ fontSize: '24px', color: '#2196F3' }}>{metrics.totalRoutes}</div>
                        </div>
                        <div style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}>
                            <div style={{ fontWeight: 'bold' }}>Accessed Routes</div>
                            <div style={{ fontSize: '24px', color: '#4CAF50' }}>{metrics.accessedRoutes}</div>
                        </div>
                        <div style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}>
                            <div style={{ fontWeight: 'bold' }}>Avg Load Time</div>
                            <div style={{ fontSize: '24px', color: '#FF9800' }}>
                                {Math.round(metrics.averageLoadTime)}ms
                            </div>
                        </div>
                        <div style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}>
                            <div style={{ fontWeight: 'bold' }}>Error Rate</div>
                            <div style={{ fontSize: '24px', color: '#F44336' }}>
                                {metrics.errorRate.toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Route Test Results */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Guard Test Results */}
                <div>
                    <h3>Route Guard Test Results</h3>
                    <div style={{ 
                        maxHeight: '300px', 
                        overflowY: 'auto', 
                        border: '1px solid #ddd', 
                        borderRadius: '5px' 
                    }}>
                        {Object.keys(guardResults).length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                                No guard tests run yet
                            </div>
                        ) : (
                            Object.entries(guardResults).map(([path, result]) => (
                                <div 
                                    key={path}
                                    style={{ 
                                        padding: '10px', 
                                        borderBottom: '1px solid #eee',
                                        backgroundColor: result.passed ? '#E8F5E8' : '#FFE8E8'
                                    }}
                                >
                                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                                        {path}
                                    </div>
                                    <div style={{ 
                                        color: getStatusColor(result.passed),
                                        marginBottom: '5px'
                                    }}>
                                        {result.passed ? '✅' : '❌'} {result.message}
                                    </div>
                                    {result.guards && (
                                        <div style={{ fontSize: '12px', color: '#666' }}>
                                            Guards: {result.guards.join(', ')}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Component Load Test Results */}
                <div>
                    <h3>Component Load Test Results</h3>
                    <div style={{ 
                        maxHeight: '300px', 
                        overflowY: 'auto', 
                        border: '1px solid #ddd', 
                        borderRadius: '5px' 
                    }}>
                        {Object.keys(componentLoadResults).length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                                No component load tests run yet
                            </div>
                        ) : (
                            Object.entries(componentLoadResults).map(([path, result]) => (
                                <div 
                                    key={path}
                                    style={{ 
                                        padding: '10px', 
                                        borderBottom: '1px solid #eee',
                                        backgroundColor: result.success ? '#E8F5E8' : '#FFE8E8'
                                    }}
                                >
                                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                                        {path}
                                    </div>
                                    <div style={{ 
                                        color: getStatusColor(result.success),
                                        marginBottom: '5px'
                                    }}>
                                        {result.success ? '✅' : '❌'} {result.message}
                                    </div>
                                    {result.success && (
                                        <div style={{ fontSize: '12px', color: '#666' }}>
                                            Load time: {result.loadTime}ms
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Preload Status */}
            {(preloadStatus.loading || preloadStatus.completed || preloadStatus.error) && (
                <div style={{ 
                    marginTop: '20px', 
                    padding: '15px', 
                    border: '1px solid #ddd', 
                    borderRadius: '5px',
                    backgroundColor: preloadStatus.error ? '#FFE8E8' : 
                                   preloadStatus.completed ? '#E8F5E8' : '#FFF3E0'
                }}>
                    <h3>Preload Status</h3>
                    {preloadStatus.loading && <div>🔄 Preloading components...</div>}
                    {preloadStatus.completed && <div>✅ All components preloaded successfully</div>}
                    {preloadStatus.error && <div>❌ Preload failed: {preloadStatus.error.message}</div>}
                </div>
            )}
        </div>
    );
};

export default AgentRouteManagerTest;