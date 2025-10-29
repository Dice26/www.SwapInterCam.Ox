/**
 * Agent Communication Status Component
 * Displays real-time status of agent communication with enhanced features
 */

import React from 'react';
import { useAgentConnection, useAgentQueue, useAgentStateSync } from '../hooks/useAgentSystem';

const AgentCommunicationStatus = () => {
    const { 
        connected, 
        connectionStats, 
        connectionHistory 
    } = useAgentConnection();
    
    const { 
        requestQueue, 
        queueHistory 
    } = useAgentQueue();
    
    const { 
        syncStatus, 
        syncHistory 
    } = useAgentStateSync();

    const getConnectionHealthColor = (health) => {
        switch (health) {
            case 'healthy': return '#4CAF50';
            case 'slow': return '#FF9800';
            case 'unhealthy': return '#F44336';
            default: return '#9E9E9E';
        }
    };

    const formatUptime = (uptime) => {
        if (!uptime) return 'N/A';
        const seconds = Math.floor(uptime / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'Never';
        return new Date(timestamp).toLocaleTimeString();
    };

    return (
        <div style={{ 
            padding: '16px', 
            border: '1px solid #ddd', 
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '12px'
        }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '14px' }}>
                Agent Communication Status
            </h3>

            {/* Connection Status */}
            <div style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px' }}>Connection</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div 
                        style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: connected ? '#4CAF50' : '#F44336'
                        }}
                    />
                    <span>{connected ? 'Connected' : 'Disconnected'}</span>
                    {connectionStats && (
                        <>
                            <span>•</span>
                            <span 
                                style={{ 
                                    color: getConnectionHealthColor(connectionStats.connectionHealth) 
                                }}
                            >
                                {connectionStats.connectionHealth}
                            </span>
                            <span>•</span>
                            <span>Uptime: {formatUptime(connectionStats.uptime)}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Request Queue Status */}
            <div style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px' }}>Request Queue</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <div>
                        <div style={{ color: '#FF9800' }}>Pending</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                            {requestQueue.pending || 0}
                        </div>
                    </div>
                    <div>
                        <div style={{ color: '#4CAF50' }}>Completed</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                            {requestQueue.completed || 0}
                        </div>
                    </div>
                    <div>
                        <div style={{ color: '#F44336' }}>Failed</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                            {requestQueue.failed || 0}
                        </div>
                    </div>
                </div>
                {requestQueue.averageWaitTime > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
                        Avg wait time: {requestQueue.averageWaitTime}ms
                    </div>
                )}
            </div>

            {/* State Synchronization */}
            <div style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px' }}>State Sync</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div 
                        style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: syncStatus.syncInProgress ? '#FF9800' : '#4CAF50'
                        }}
                    />
                    <span>
                        {syncStatus.syncInProgress ? 'Syncing...' : 'Idle'}
                    </span>
                    <span>•</span>
                    <span>Last sync: {formatTimestamp(syncStatus.lastSync)}</span>
                </div>
            </div>

            {/* Connection History Chart */}
            {connectionHistory.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '13px' }}>Connection History</h4>
                    <div style={{ 
                        display: 'flex', 
                        height: '20px', 
                        gap: '2px',
                        alignItems: 'end'
                    }}>
                        {connectionHistory.slice(-10).map((entry, index) => (
                            <div
                                key={index}
                                style={{
                                    flex: 1,
                                    height: entry.connected ? '100%' : '30%',
                                    backgroundColor: getConnectionHealthColor(entry.health),
                                    borderRadius: '2px',
                                    opacity: 0.7 + (index / 10) * 0.3
                                }}
                                title={`${formatTimestamp(entry.timestamp)}: ${entry.health}`}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Queue History Chart */}
            {queueHistory.length > 0 && (
                <div>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '13px' }}>Queue Activity</h4>
                    <div style={{ 
                        display: 'flex', 
                        height: '30px', 
                        gap: '1px',
                        alignItems: 'end'
                    }}>
                        {queueHistory.slice(-20).map((entry, index) => {
                            const maxHeight = Math.max(
                                ...queueHistory.map(h => h.pending + h.completed + h.failed)
                            );
                            const totalRequests = entry.pending + entry.completed + entry.failed;
                            const height = maxHeight > 0 ? (totalRequests / maxHeight) * 100 : 0;
                            
                            return (
                                <div
                                    key={index}
                                    style={{
                                        flex: 1,
                                        height: `${Math.max(height, 5)}%`,
                                        backgroundColor: entry.pending > 0 ? '#FF9800' : '#4CAF50',
                                        borderRadius: '1px',
                                        opacity: 0.6 + (index / 20) * 0.4
                                    }}
                                    title={`${formatTimestamp(entry.timestamp)}: ${totalRequests} requests`}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgentCommunicationStatus;