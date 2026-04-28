#!/usr/bin/env node
/**
 * Pre-commit audit script
 * Checks for sensitive data before committing
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Running pre-commit audit...\n');

// Patterns to check for sensitive data
const SENSITIVE_PATTERNS = [
    { pattern: /password\s*=\s*['"][^'"]+['"]/gi, name: 'Password' },
    { pattern: /api[_-]?key\s*=\s*['"][^'"]+['"]/gi, name: 'API Key' },
    { pattern: /secret\s*=\s*['"][^'"]+['"]/gi, name: 'Secret' },
    { pattern: /token\s*=\s*['"][^'"]+['"]/gi, name: 'Token' },
    { pattern: /smtp.*password/gi, name: 'SMTP Password' },
    { pattern: /mongodb:\/\/[^@]+:[^@]+@/gi, name: 'Database URL with credentials' },
    { pattern: /postgres:\/\/[^@]+:[^@]+@/gi, name: 'Database URL with credentials' },
];

// Files that should never be committed
const FORBIDDEN_FILES = [
    '.env',
    '.env.local',
    '.env.production',
    'npm-debug.log',
    'yarn-error.log',
];

let hasIssues = false;

try {
    // Get list of staged files
    const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
        .split('\n')
        .filter(f => f.trim());

    console.log(`📋 Checking ${stagedFiles.length} staged files...\n`);

    // Check for forbidden files
    stagedFiles.forEach(file => {
        const basename = path.basename(file);
        if (FORBIDDEN_FILES.includes(basename)) {
            console.error(`❌ FORBIDDEN FILE: ${file}`);
            console.error(`   This file should never be committed!\n`);
            hasIssues = true;
        }
    });

    // Check for sensitive patterns in text files
    stagedFiles.forEach(file => {
        if (!fs.existsSync(file)) return;
        
        const ext = path.extname(file);
        const textExtensions = ['.js', '.json', '.md', '.txt', '.yml', '.yaml', '.env.example'];
        
        if (!textExtensions.includes(ext)) return;

        try {
            const content = fs.readFileSync(file, 'utf-8');
            
            SENSITIVE_PATTERNS.forEach(({ pattern, name }) => {
                const matches = content.match(pattern);
                if (matches && !file.includes('.env.example')) {
                    console.warn(`⚠️  POTENTIAL ${name.toUpperCase()} in: ${file}`);
                    matches.forEach(match => {
                        console.warn(`   Found: ${match.substring(0, 50)}...`);
                    });
                    console.warn('');
                    hasIssues = true;
                }
            });
        } catch (err) {
            // Skip files that can't be read
        }
    });

    // Check for large files
    stagedFiles.forEach(file => {
        if (!fs.existsSync(file)) return;
        
        const stats = fs.statSync(file);
        const sizeMB = stats.size / (1024 * 1024);
        
        if (sizeMB > 10) {
            console.warn(`⚠️  LARGE FILE (${sizeMB.toFixed(2)}MB): ${file}`);
            console.warn(`   Consider using Git LFS for large files\n`);
        }
    });

    if (hasIssues) {
        console.error('\n❌ COMMIT BLOCKED: Security issues detected!');
        console.error('\nPlease fix the issues above before committing.');
        console.error('If these are false positives, review carefully.\n');
        process.exit(1);
    } else {
        console.log('✅ All checks passed! Safe to commit.\n');
        process.exit(0);
    }

} catch (error) {
    console.error('Error running audit:', error.message);
    process.exit(1);
}
