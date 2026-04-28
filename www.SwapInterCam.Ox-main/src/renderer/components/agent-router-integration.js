/**
 * Agent Router Integration
 * Integrates React Router with the Agent Route Manager
 */

import React, { useEffect, useState, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import reactAgentRouteManager from './react-agent-route-manager';
import { useAgentSystem } from '../hooks/useAgentSystem';

/**
 * Agent-Driven Router Component
 */
export const AgentRouter = ({ children, fallbackComponent: FallbackComponent }) => {
    const [routerConfig, setRouterConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const { connected } = useAgentSystem();

    // Generate router configuration from agent routes
    useEffect(() => {
        const generateConfig = async () => {
            try {
                setLoading(true);
                
                // Preload critical components
                await reactAgentRouteManager.preloadComponents();
                
                // Generate router configuration
                const config = reactAgentRouteManager.generateReactRouterConfig();
                setRouterConfig(config);
                
                console.log('🛣️ Router configuration generated:', config);
            } catch (error) {
                console.error('❌ Failed to generate router config:', error);
            } finally {
                setLoading(false);
            }
        };

        generateConfig();
    }, []);

    // Memoize routes to prevent unnecessary re-renders
    const routes = useMemo(() => {
        if (!routerConfig) return [];
        
        return routerConfig.routes.map(route => 
            renderRoute(route, reactAgentRouteManager)
        );
    }, [routerConfig]);

    if (loading) {
        return (
            <div className="agent-router-loading">
                <div className="loading-spinner" />
                <div>Initializing Agent Router...</div>
            </div>
        );
    }

    if (!connected && FallbackComponent) {
        return <FallbackComponent />;
    }

    return (
        <BrowserRouter>
            <Routes>
                {routes}
                {children}
                <Route path="*" element={<Navigate to="/chat" replace />} />
            </Routes>
        </BrowserRouter>
    );
};

/**
 * Render individual route with nested children
 */
const renderRoute = (routeConfig, routeManager) => {
    const element = routeConfig.element;
    
    if (routeConfig.children && routeConfig.children.length > 0) {
        return (
            <Route key={routeConfig.path} path={routeConfig.path} element={element}>
                {routeConfig.children.map(child => renderRoute(child, routeManager))}
            </Route>
        );
    }
    
    return <Route key={routeConfig.path} path={routeConfig.path} element={element} />;
};

export default AgentRouter;