/**
 * Comprehensive Logging System
 * Advanced logging with multiple levels, file rotation, and structured output
 */

const fs = require('fs').promises;
const path = require('path');
const util = require('util');

class Logger {
    constructor(options = {}) {
        this.logLevel = options.logLevel || 'info';
        this.logDir = options.logDir || path.join(__dirname, 'logs');
        this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
        this.maxFiles = options.maxFiles || 10;
        this.enableConsole = options.enableConsole !== false;
        this.enableFile = options.enableFile !== false;
        
        // Log levels with numeric values for comparison
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3,
            trace: 4
        };
        
        // Color codes for console output
        this.colors = {
            error: '\x1b[31m',   // Red
            warn: '\x1b[33m',    // Yellow
            info: '\x1b[36m',    // Cyan
            debug: '\x1b[35m',   // Magenta
            trace: '\x1b[37m',   // White
            reset: '\x1b[0m'     // Reset
        };
        
        // Log file paths
        this.logFiles = {
            combined: path.join(this.logDir, 'combined.log'),
            error: path.join(this.logDir, 'error.log'),
            access: path.join(this.logDir, 'access.log'),
            performance: path.join(this.logDir, 'performance.log'),
            security: path.join(this.logDir, 'security.log')
        };
        
        // Initialize logging system
        this.initialize();
        
        console.log('📝 Logger initialized with level:', this.logLevel);
    }

    async initialize() {
        try {
            // Create logs directory if it doesn't exist
            await fs.mkdir(this.logDir, { recursive: true });
            
            // Initialize log files
            for (const [type, filePath] of Object.entries(this.logFiles)) {
                try {
                    await fs.access(filePath);
                } catch (error) {
                    // File doesn't exist, create it
                    await fs.writeFile(filePath, '');
                }
            }
            
            console.log('📁 Log directory initialized:', this.logDir);
        } catch (error) {
            console.error('❌ Failed to initialize logger:', error);
        }
    }

    shouldLog(level) {
        return this.levels[level] <= this.levels[this.logLevel];
    }

    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const pid = process.pid;
        
        // Create base log entry
        const logEntry = {
            timestamp,
            level: level.toUpperCase(),
            pid,
            message,
            ...meta
        };
        
        // Add stack trace for errors
        if (level === 'error' && meta.error instanceof Error) {
            logEntry.stack = meta.error.stack;
        }
        
        return logEntry;
    }

    formatConsoleMessage(logEntry) {
        const color = this.colors[logEntry.level.toLowerCase()] || this.colors.info;
        const reset = this.colors.reset;
        
        let output = `${color}[${logEntry.timestamp}] ${logEntry.level}${reset}: ${logEntry.message}`;
        
        // Add metadata if present
        const metaKeys = Object.keys(logEntry).filter(key => 
            !['timestamp', 'level', 'pid', 'message', 'stack'].includes(key)
        );
        
        if (metaKeys.length > 0) {
            const metaData = {};
            metaKeys.forEach(key => {
                metaData[key] = logEntry[key];
            });
            output += ` ${util.inspect(metaData, { colors: true, compact: true })}`;
        }
        
        // Add stack trace for errors
        if (logEntry.stack) {
            output += `\n${logEntry.stack}`;
        }
        
        return output;
    }

    async writeToFile(filePath, logEntry) {
        try {
            const logLine = JSON.stringify(logEntry) + '\n';
            
            // Check file size and rotate if necessary
            await this.rotateLogIfNeeded(filePath);
            
            // Append to log file
            await fs.appendFile(filePath, logLine);
        } catch (error) {
            console.error('❌ Failed to write to log file:', error);
        }
    }

    async rotateLogIfNeeded(filePath) {
        try {
            const stats = await fs.stat(filePath);
            
            if (stats.size > this.maxFileSize) {
                await this.rotateLogFile(filePath);
            }
        } catch (error) {
            // File doesn't exist or other error, ignore
        }
    }

    async rotateLogFile(filePath) {
        try {
            const dir = path.dirname(filePath);
            const ext = path.extname(filePath);
            const basename = path.basename(filePath, ext);
            
            // Rotate existing files
            for (let i = this.maxFiles - 1; i > 0; i--) {
                const oldFile = path.join(dir, `${basename}.${i}${ext}`);
                const newFile = path.join(dir, `${basename}.${i + 1}${ext}`);
                
                try {
                    await fs.access(oldFile);
                    if (i === this.maxFiles - 1) {
                        // Delete the oldest file
                        await fs.unlink(oldFile);
                    } else {
                        // Rename to next number
                        await fs.rename(oldFile, newFile);
                    }
                } catch (error) {
                    // File doesn't exist, continue
                }
            }
            
            // Move current file to .1
            const rotatedFile = path.join(dir, `${basename}.1${ext}`);
            await fs.rename(filePath, rotatedFile);
            
            console.log(`📁 Log file rotated: ${path.basename(filePath)}`);
        } catch (error) {
            console.error('❌ Failed to rotate log file:', error);
        }
    }

    async log(level, message, meta = {}) {
        if (!this.shouldLog(level)) {
            return;
        }
        
        const logEntry = this.formatMessage(level, message, meta);
        
        // Console output
        if (this.enableConsole) {
            const consoleMessage = this.formatConsoleMessage(logEntry);
            console.log(consoleMessage);
        }
        
        // File output
        if (this.enableFile) {
            // Write to combined log
            await this.writeToFile(this.logFiles.combined, logEntry);
            
            // Write to specific log files based on level or type
            if (level === 'error') {
                await this.writeToFile(this.logFiles.error, logEntry);
            }
            
            if (meta.type === 'access') {
                await this.writeToFile(this.logFiles.access, logEntry);
            }
            
            if (meta.type === 'performance') {
                await this.writeToFile(this.logFiles.performance, logEntry);
            }
            
            if (meta.type === 'security') {
                await this.writeToFile(this.logFiles.security, logEntry);
            }
        }
    }

    // Convenience methods
    error(message, meta = {}) {
        return this.log('error', message, meta);
    }

    warn(message, meta = {}) {
        return this.log('warn', message, meta);
    }

    info(message, meta = {}) {
        return this.log('info', message, meta);
    }

    debug(message, meta = {}) {
        return this.log('debug', message, meta);
    }

    trace(message, meta = {}) {
        return this.log('trace', message, meta);
    }

    // Specialized logging methods
    access(method, url, statusCode, responseTime, meta = {}) {
        return this.log('info', `${method} ${url} ${statusCode} ${responseTime}ms`, {
            type: 'access',
            method,
            url,
            statusCode,
            responseTime,
            ...meta
        });
    }

    performance(operation, duration, meta = {}) {
        return this.log('info', `${operation} completed in ${duration}ms`, {
            type: 'performance',
            operation,
            duration,
            ...meta
        });
    }

    security(event, details, meta = {}) {
        return this.log('warn', `Security event: ${event}`, {
            type: 'security',
            event,
            details,
            ...meta
        });
    }

    // Action logging
    actionStart(actionName, params = {}, context = {}) {
        return this.log('info', `Action started: ${actionName}`, {
            type: 'action',
            action: actionName,
            params,
            context,
            phase: 'start'
        });
    }

    actionComplete(actionName, result, duration, context = {}) {
        const level = result.success ? 'info' : 'error';
        return this.log(level, `Action completed: ${actionName} (${duration}ms)`, {
            type: 'action',
            action: actionName,
            result,
            duration,
            context,
            phase: 'complete'
        });
    }

    // Get recent log entries
    async getRecentLogs(type = 'combined', lines = 100) {
        try {
            const filePath = this.logFiles[type];
            if (!filePath) {
                throw new Error(`Unknown log type: ${type}`);
            }
            
            const content = await fs.readFile(filePath, 'utf8');
            const logLines = content.trim().split('\n').filter(line => line.length > 0);
            
            // Get the last N lines
            const recentLines = logLines.slice(-lines);
            
            // Parse JSON entries
            const entries = recentLines.map(line => {
                try {
                    return JSON.parse(line);
                } catch (error) {
                    return { message: line, timestamp: new Date().toISOString(), level: 'INFO' };
                }
            });
            
            return entries;
        } catch (error) {
            console.error(`❌ Failed to read log file ${type}:`, error);
            return [];
        }
    }

    // Search logs
    async searchLogs(query, type = 'combined', maxResults = 100) {
        try {
            const entries = await this.getRecentLogs(type, 1000); // Search in last 1000 entries
            
            const results = entries.filter(entry => {
                const searchText = JSON.stringify(entry).toLowerCase();
                return searchText.includes(query.toLowerCase());
            }).slice(0, maxResults);
            
            return results;
        } catch (error) {
            console.error(`❌ Failed to search logs:`, error);
            return [];
        }
    }

    // Action logging
    actionStart(actionName, params = {}, context = {}) {
        return this.log('info', `Action started: ${actionName}`, {
            type: 'action',
            action: actionName,
            params,
            context,
            phase: 'start'
        });
    }

    actionComplete(actionName, result, duration, context = {}) {
        const level = result.success ? 'info' : 'error';
        return this.log(level, `Action completed: ${actionName} (${duration}ms)`, {
            type: 'action',
            action: actionName,
            result,
            duration,
            context,
            phase: 'complete'
        });
    }

    // State change logging
    stateChange(component, changes, newState, context = {}) {
        return this.log('info', `State changed: ${component}`, {
            type: 'state',
            component,
            changes,
            newState,
            context
        });
    }

    // Issue logging
    issueDetected(issueId, issue, context = {}) {
        return this.log('warn', `Issue detected: ${issue.message}`, {
            type: 'issue',
            issueId,
            issue,
            context,
            phase: 'detected'
        });
    }

    issueResolved(issueId, issue, resolution, context = {}) {
        return this.log('info', `Issue resolved: ${issue.message}`, {
            type: 'issue',
            issueId,
            issue,
            resolution,
            context,
            phase: 'resolved'
        });
    }

    // Recovery logging
    recoveryStart(recoveryId, module, issue, context = {}) {
        return this.log('info', `Recovery started: ${module} for ${issue.message}`, {
            type: 'recovery',
            recoveryId,
            module,
            issue,
            context,
            phase: 'start'
        });
    }

    recoveryComplete(recoveryId, module, result, duration, context = {}) {
        const level = result.success ? 'info' : 'error';
        return this.log(level, `Recovery completed: ${module} (${duration}ms)`, {
            type: 'recovery',
            recoveryId,
            module,
            result,
            duration,
            context,
            phase: 'complete'
        });
    }

    // Connection logging
    connectionEvent(type, details, context = {}) {
        const level = type === 'connected' ? 'info' : 'warn';
        return this.log(level, `Connection ${type}`, {
            type: 'connection',
            connectionType: type,
            details,
            context
        });
    }

    // Get log statistics
    async getLogStats() {
        const stats = {};
        
        for (const [type, filePath] of Object.entries(this.logFiles)) {
            try {
                const fileStats = await fs.stat(filePath);
                stats[type] = {
                    size: fileStats.size,
                    modified: fileStats.mtime,
                    exists: true
                };
            } catch (error) {
                stats[type] = {
                    size: 0,
                    modified: null,
                    exists: false
                };
            }
        }
        
        return stats;
    }

    // Cleanup old log files
    async cleanup() {
        console.log('🧹 Cleaning up logger...');
        // Logger cleanup is handled by log rotation
    }
}

module.exports = Logger;