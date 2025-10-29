/**
 * Agent Communication Test Component
 * Provides testing interface for enhanced communication features
 */

import React, { useState } from 'react';
import { 
    useAgentSystem, 
    useAgentRetry, 
    useAgentConnection 
} from '../hooks/useAgentSystem';

const AgentCommunicationTest = () => {
    const { 
        dispatch, 
        batchDispatch, 
        priorityDispatch, 
        loading, 
        error,
        cancelAllRequests
    } = useAgentSystem();
    
    const { 
        dispatchWithRetry, 
        configureRetry, 
        retryStats 
    } = useAgentRetry();
    
    const { 
        configureStateSync 
    } = useAgentConnection();

    const [testRoute, setTestRoute] = useState('test/ping');
    const [testPayload, setTestPayload] = useState('{}');
    const [testResults, setTestResults] = useState([]);
    const [retryConfig, setRetryConfig] = useState({
        maxRetries: 3,
        baseDelay: 1000,
        backoffFactor: 2
    });

    const addTestResult = (type, result, error = null) => {
        const timestamp = new Date().toLocaleTimeString();
        setTestResults(prev => [
            { timestamp, type, result, error },
            ...prev.slice(0, 9) // Keep last 10 results
        ]);
    };

    const handleSingleDispatch = async () => {
        try {
            const payload = JSON.parse(testPayload);
            const result = await dispatch(testRoute, payload);
            addTestResult('Single Dispatch', result);
        } catch (err) {
            addTestResult('Single Dispatch', null, err.message);
        }
    };

    const handleRetryDispatch = async () => {
        try {
            const payload = JSON.parse(testPayload);
            const result = await dispatchWithRetry(testRoute, payload);
            addTestResult('Retry Dispatch', result);
        } catch (err) {
            addTestResult('Retry Dispatch', null, err.message);
        }
    };

    const handlePriorityDispatch = async () => {
        try {
            const payload = JSON.parse(testPayload);
            const result = await priorityDispatch(testRoute, payload);
            addTestResult('Priority Dispatch', result);
        } catch (err) {
            addTestResult('Priority Dispatch', null, err.message);
        }
    };

    const handleBatchDispatch = async () => {
        try {
            const payload = JSON.parse(testPayload);
            const requests = [
                { route: testRoute, payload: { ...payload, batch: 1 } },
                { route: testRoute, payload: { ...payload, batch: 2 } },
                { route: testRoute, payload: { ...payload, batch: 3 } }
            ];
            
            const result = await batchDispatch(requests, { concurrency: 2 });
            addTestResult('Batch Dispatch', result);
        } catch (err) {
            addTestResult('Batch Dispatch', null, err.message);
        }
    };

    const handleConfigureRetry = () => {
        configureRetry(retryConfig);
        addTestResult('Configure Retry', 'Configuration updated');
    };

    const handleConfigureStateSync = () => {
        configureStateSync({ 
            syncInterval: 3000, 
            enabled: true 
        });
        addTestResult('Configure State Sync', 'Sync interval set to 3s');
    };

    const handleCancelRequests = () => {
        const cancelled = cancelAllRequests();
        addTestResult('Cancel Requests', `Cancelled ${cancelled} requests`);
    };

    return (
        <div style={{ 
            padding: '16px', 
            border: '1px solid #ddd', 
            borderRadius: '8px',
            fontFamily: 'Arial, sans-serif'
        }}>
            <h3 style={{ margin: '0 0 16px 0' }}>
                Agent Communication Test Interface
            </h3>

            {/* Test Configuration */}
            <div style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>Test Configuration</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', alignItems: 'center' }}>
                    <label>Route:</label>
                    <input
                        type="text"
                        value={testRoute}
                        onChange={(e) => setTestRoute(e.target.value)}
                        style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                    
                    <label>Payload (JSON):</label>
                    <textarea
                        value={testPayload}
                        onChange={(e) => setTestPayload(e.target.value)}
                        rows={3}
                        style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '4px', fontFamily: 'monospace' }}
                    />
                </div>
            </div>

            {/* Retry Configuration */}
            <div style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>Retry Configuration</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <div>
                        <label>Max Retries:</label>
                        <input
                            type="number"
                            value={retryConfig.maxRetries}
                            onChange={(e) => setRetryConfig(prev => ({ 
                                ...prev, 
                                maxRetries: parseInt(e.target.value) 
                            }))}
                            style={{ width: '100%', padding: '4px', border: '1px solid #ccc', borderRadius: '4px' }}
                        />
                    </div>
                    <div>
                        <label>Base Delay (ms):</label>
                        <input
                            type="number"
                            value={retryConfig.baseDelay}
                            onChange={(e) => setRetryConfig(prev => ({ 
                                ...prev, 
                                baseDelay: parseInt(e.target.value) 
                            }))}
                            style={{ width: '100%', padding: '4px', border: '1px solid #ccc', borderRadius: '4px' }}
                        />
                    </div>
                    <div>
                        <label>Backoff Factor:</label>
                        <input
                            type="number"
                            step="0.1"
                            value={retryConfig.backoffFactor}
                            onChange={(e) => setRetryConfig(prev => ({ 
                                ...prev, 
                                backoffFactor: parseFloat(e.target.value) 
                            }))}
                            style={{ width: '100%', padding: '4px', border: '1px solid #ccc', borderRadius: '4px' }}
                        />
                    </div>
                </div>
            </div>

            {/* Test Actions */}
            <div style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>Test Actions</h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        onClick={handleSingleDispatch}
                        disabled={loading}
                        style={{ 
                            padding: '8px 12px', 
                            border: 'none', 
                            borderRadius: '4px', 
                            backgroundColor: '#2196F3', 
                            color: 'white',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Single Dispatch
                    </button>
                    
                    <button
                        onClick={handleRetryDispatch}
                        disabled={loading}
                        style={{ 
                            padding: '8px 12px', 
                            border: 'none', 
                            borderRadius: '4px', 
                            backgroundColor: '#FF9800', 
                            color: 'white',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Retry Dispatch
                    </button>
                    
                    <button
                        onClick={handlePriorityDispatch}
                        disabled={loading}
                        style={{ 
                            padding: '8px 12px', 
                            border: 'none', 
                            borderRadius: '4px', 
                            backgroundColor: '#F44336', 
                            color: 'white',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Priority Dispatch
                    </button>
                    
                    <button
                        onClick={handleBatchDispatch}
                        disabled={loading}
                        style={{ 
                            padding: '8px 12px', 
                            border: 'none', 
                            borderRadius: '4px', 
                            backgroundColor: '#4CAF50', 
                            color: 'white',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Batch Dispatch
                    </button>
                </div>
            </div>

            {/* Configuration Actions */}
            <div style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>Configuration Actions</h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        onClick={handleConfigureRetry}
                        style={{ 
                            padding: '8px 12px', 
                            border: '1px solid #ccc', 
                            borderRadius: '4px', 
                            backgroundColor: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        Apply Retry Config
                    </button>
                    
                    <button
                        onClick={handleConfigureStateSync}
                        style={{ 
                            padding: '8px 12px', 
                            border: '1px solid #ccc', 
                            borderRadius: '4px', 
                            backgroundColor: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        Configure State Sync
                    </button>
                    
                    <button
                        onClick={handleCancelRequests}
                        style={{ 
                            padding: '8px 12px', 
                            border: '1px solid #F44336', 
                            borderRadius: '4px', 
                            backgroundColor: 'white',
                            color: '#F44336',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel All Requests
                    </button>
                </div>
            </div>

            {/* Retry Statistics */}
            <div style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>Retry Statistics</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2196F3' }}>
                            {retryStats.totalRetries}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>Total Retries</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4CAF50' }}>
                            {retryStats.successfulRetries}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>Successful</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#F44336' }}>
                            {retryStats.failedRetries}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>Failed</div>
                    </div>
                </div>
            </div>

            {/* Current Status */}
            {loading && (
                <div style={{ 
                    padding: '8px', 
                    backgroundColor: '#E3F2FD', 
                    border: '1px solid #2196F3', 
                    borderRadius: '4px',
                    marginBottom: '16px'
                }}>
                    ⏳ Request in progress...
                </div>
            )}

            {error && (
                <div style={{ 
                    padding: '8px', 
                    backgroundColor: '#FFEBEE', 
                    border: '1px solid #F44336', 
                    borderRadius: '4px',
                    marginBottom: '16px',
                    color: '#F44336'
                }}>
                    ❌ Error: {error}
                </div>
            )}

            {/* Test Results */}
            <div>
                <h4 style={{ margin: '0 0 8px 0' }}>Test Results</h4>
                <div style={{ 
                    maxHeight: '200px', 
                    overflowY: 'auto', 
                    border: '1px solid #ccc', 
                    borderRadius: '4px',
                    backgroundColor: '#f9f9f9'
                }}>
                    {testResults.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: '#666' }}>
                            No test results yet
                        </div>
                    ) : (
                        testResults.map((result, index) => (
                            <div 
                                key={index}
                                style={{ 
                                    padding: '8px', 
                                    borderBottom: index < testResults.length - 1 ? '1px solid #ddd' : 'none',
                                    fontFamily: 'monospace',
                                    fontSize: '12px'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: 'bold' }}>{result.type}</span>
                                    <span style={{ color: '#666' }}>{result.timestamp}</span>
                                </div>
                                {result.error ? (
                                    <div style={{ color: '#F44336' }}>❌ {result.error}</div>
                                ) : (
                                    <div style={{ color: '#4CAF50' }}>
                                        ✅ {JSON.stringify(result.result, null, 2)}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AgentCommunicationTest;