#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building QMS Professional for production...');

// Install frontend dependencies
console.log('📦 Installing frontend dependencies...');
execSync('npm install', { cwd: 'packages/frontend', stdio: 'inherit' });

// Build frontend
console.log('🏗️ Building frontend...');
execSync('npm run build', { cwd: 'packages/frontend', stdio: 'inherit' });

// Install backend dependencies  
console.log('📦 Installing backend dependencies...');
execSync('npm install', { cwd: 'packages/backend', stdio: 'inherit' });

console.log('✅ Build complete!');