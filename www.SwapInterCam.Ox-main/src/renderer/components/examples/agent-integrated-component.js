/**
 * Example Agent-Integrated React Components
 * Demonstrates how to use the agent route manager with React components
 */

import React, { useEffect, useState } from 'react';
import { useAgentRoute, useAgentRouteState, withAgentIntegration } from '../react-agent-route-manager';

/**
 * Example Chat Manager Component with Agent Integration
 */
export const ChatManager = ({ 
    agentId, 
    agentState, 
    dispatch, 
    updateAgentState,
    maxTabs,
    autoSwitch,
    sessionPersistence,
    onComponentMount,
    onComponentUnmount
}) => {
    const [activeTab, setActiveTab] = useState(agentState.activeTab || 'whatsapp');
    const [tabs, setTabs] = useState(agentState.tabs || ['whatsapp', 'messenger', 'line']);
    
    useEffect(() => {
        onComponentMount?.();
        
        // Initialize agent state
        updateAgentState({
            activeTab,
            tabs,
            initialized: true,
            timestamp: Date.now()
        });

        return () => {
            onComponentUnmount?.();
        };
    }, []);

    // Handle tab switching with agent notification
    const handleTabSwitch = async (tabName) => {
        try {
            setActiveTab(tabName);
            
            // Notify agent of tab switch
            await dispatch('switchTab', { 
                from: activeTab, 
                to: tabName,
                timestamp: Date.now()
            });
            
            // Update agent state
            updateAgentState({ 
                activeTab: tabName,
                lastSwitched: Date.now()
            });
            
        } catch (error) {
            console.error('Tab switch failed:', error);
        }
    };

    return (
        <div className="chat-manager">
            <div className="chat-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab}
                        className={`tab-button ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => handleTabSwitch(tab)}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>
            
            <div className="chat-content">
                <div className="agent-status">
                    Agent: {agentId} | State: {JSON.stringify(agentState)}
                </div>
                <div className="active-tab-content">
                    Content for {activeTab} tab
                </div>
            </div>
        </div>
    );
};

/**
 * Example Face Swap Controls with Agent Integration
 */
export const FaceSwapControls = withAgentIntegration(({ 
    agentId,
    agentState,
    dispatch,
    updateAgentState,
    targetFPS,
    qualityLevel,
    realTimePreview,
    autoOptimize
}) => {
    const [currentFPS, setCurrentFPS] = useState(agentState.currentFPS || 0);
    const [quality, setQuality] = useState(agentState.quality || qualityLevel);
    const [processing, setProcessing] = useState(agentState.processing || false);

    useEffect(() => {
        // Simulate FPS monitoring
        const fpsInterval = setInterval(() => {
            const fps = Math.floor(Math.random() * 30) + 10;
            setCurrentFPS(fps);
            
            updateAgentState({ 
                currentFPS: fps,
                timestamp: Date.now()
            });
            
            // Auto-optimize if enabled and FPS is low
            if (autoOptimize && fps < targetFPS) {
                handleQualityAdjustment('lower');
            }
        }, 1000);

        return () => clearInterval(fpsInterval);
    }, [targetFPS, autoOptimize, updateAgentState]);

    const handleQualityAdjustment = async (direction) => {
        try {
            const newQuality = direction === 'higher' ? 
                Math.min(quality + 1, 10) : 
                Math.max(quality - 1, 1);
            
            setQuality(newQuality);
            
            await dispatch('adjustQuality', { 
                from: quality, 
                to: newQuality,
                reason: direction === 'lower' ? 'performance' : 'user_request'
            });
            
            updateAgentState({ 
                quality: newQuality,
                lastAdjusted: Date.now()
            });
            
        } catch (error) {
            console.error('Quality adjustment failed:', error);
        }
    };

    const toggleProcessing = async () => {
        try {
            const newProcessing = !processing;
            setProcessing(newProcessing);
            
            await dispatch('toggleProcessing', { 
                enabled: newProcessing,
                timestamp: Date.now()
            });
            
            updateAgentState({ 
                processing: newProcessing,
                lastToggled: Date.now()
            });
            
        } catch (error) {
            console.error('Processing toggle failed:', error);
        }
    };

    return (
        <div className="face-swap-controls">
            <div className="control-header">
                <h3>Face Swap Controls</h3>
                <div className="agent-info">Agent: {agentId}</div>
            </div>
            
            <div className="performance-metrics">
                <div className="metric">
                    <label>Current FPS:</label>
                    <span className={currentFPS < targetFPS ? 'warning' : 'normal'}>
                        {currentFPS}
                    </span>
                </div>
                <div className="metric">
                    <label>Target FPS:</label>
                    <span>{targetFPS}</span>
                </div>
            </div>
            
            <div className="quality-controls">
                <label>Quality Level: {quality}</label>
                <div className="quality-buttons">
                    <button onClick={() => handleQualityAdjustment('lower')}>
                        Lower Quality
                    </button>
                    <button onClick={() => handleQualityAdjustment('higher')}>
                        Higher Quality
                    </button>
                </div>
            </div>
            
            <div className="processing-controls">
                <button 
                    className={`processing-toggle ${processing ? 'active' : ''}`}
                    onClick={toggleProcessing}
                >
                    {processing ? 'Stop Processing' : 'Start Processing'}
                </button>
            </div>
            
            <div className="agent-state-debug">
                <details>
                    <summary>Agent State (Debug)</summary>
                    <pre>{JSON.stringify(agentState, null, 2)}</pre>
                </details>
            </div>
        </div>
    );
}, 'face-swap-agent');

export default { ChatManager, FaceSwapControls };