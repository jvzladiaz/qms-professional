#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Vercel build process...');
console.log('Node version:', process.version);
console.log('NPM version:', execSync('npm --version', { encoding: 'utf8' }).trim());
console.log('Working directory:', process.cwd());
console.log('Environment:', process.env.NODE_ENV || 'not set');

// Helper function to run commands with detailed logging
function runCommand(cmd, options = {}) {
  console.log(`\n🔨 Running: ${cmd}`);
  try {
    const result = execSync(cmd, { 
      encoding: 'utf8',
      stdio: ['inherit', 'pipe', 'pipe'],
      ...options
    });
    console.log('✅ Command succeeded');
    if (result && result.trim()) {
      console.log('Output:', result.trim());
    }
    return result;
  } catch (error) {
    console.error('❌ Command failed:', cmd);
    console.error('Exit code:', error.status);
    if (error.stdout) console.error('STDOUT:', error.stdout.toString());
    if (error.stderr) console.error('STDERR:', error.stderr.toString());
    throw error;
  }
}

try {
  // Log directory contents
  console.log('\n📁 Root directory contents:');
  const rootFiles = fs.readdirSync(process.cwd());
  console.log(rootFiles.join(', '));

  // Check if we're in the right directory
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    console.log('✅ Found root package.json');
    const rootPackage = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log('Package name:', rootPackage.name);
    console.log('Package version:', rootPackage.version);
  } else {
    console.error('❌ Root package.json not found');
    process.exit(1);
  }

  // Check packages directory
  const packagesDir = path.join(process.cwd(), 'packages');
  if (fs.existsSync(packagesDir)) {
    console.log('✅ Packages directory exists');
    const packages = fs.readdirSync(packagesDir);
    console.log('Available packages:', packages.join(', '));
  } else {
    console.error('❌ Packages directory not found');
    process.exit(1);
  }

  // Navigate to frontend directory
  const frontendDir = path.join(process.cwd(), 'packages', 'frontend');
  if (fs.existsSync(frontendDir)) {
    console.log('✅ Frontend directory exists');
    
    // Log frontend directory contents
    console.log('\n📁 Frontend directory contents:');
    const frontendFiles = fs.readdirSync(frontendDir);
    console.log(frontendFiles.join(', '));
    
    // Check frontend package.json
    const frontendPackageJsonPath = path.join(frontendDir, 'package.json');
    if (fs.existsSync(frontendPackageJsonPath)) {
      const frontendPackage = JSON.parse(fs.readFileSync(frontendPackageJsonPath, 'utf8'));
      console.log('Frontend package name:', frontendPackage.name);
      console.log('Frontend package version:', frontendPackage.version);
      console.log('Build script:', frontendPackage.scripts?.build || 'not found');
      console.log('Dependencies count:', Object.keys(frontendPackage.dependencies || {}).length);
      console.log('DevDependencies count:', Object.keys(frontendPackage.devDependencies || {}).length);
    }
  } else {
    console.error('❌ Frontend directory not found');
    process.exit(1);
  }

  // Change to frontend directory
  console.log('\n📂 Changing to frontend directory...');
  process.chdir(frontendDir);
  console.log('Current working directory:', process.cwd());

  // Install frontend dependencies with verbose logging
  console.log('\n📦 Installing frontend dependencies...');
  runCommand('npm install --verbose');

  // Check if node_modules was created
  const nodeModulesPath = path.join(frontendDir, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    console.log('✅ node_modules directory created');
    const nodeModulesSize = fs.readdirSync(nodeModulesPath).length;
    console.log(`📊 node_modules contains ${nodeModulesSize} packages`);
  } else {
    console.error('❌ node_modules directory not found after npm install');
    process.exit(1);
  }

  // Check TypeScript config
  const tsconfigPath = path.join(frontendDir, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    console.log('✅ TypeScript config found');
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    console.log('TypeScript target:', tsconfig.compilerOptions?.target || 'not set');
    console.log('Module system:', tsconfig.compilerOptions?.module || 'not set');
  }

  // Check Vite config
  const viteConfigPath = path.join(frontendDir, 'vite.config.ts');
  if (fs.existsSync(viteConfigPath)) {
    console.log('✅ Vite config found');
  }

  // Run TypeScript compilation first
  console.log('\n🔧 Running TypeScript compilation...');
  runCommand('npx tsc --noEmit');

  // Build frontend
  console.log('\n🏗️ Building frontend with Vite...');
  runCommand('npm run build');

  // Check if dist directory was created
  const distPath = path.join(frontendDir, 'dist');
  if (fs.existsSync(distPath)) {
    console.log('✅ Build output directory created');
    const distFiles = fs.readdirSync(distPath);
    console.log('Build output files:', distFiles.join(', '));
    
    // Check index.html
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      const indexSize = fs.statSync(indexPath).size;
      console.log(`✅ index.html created (${indexSize} bytes)`);
    }
  } else {
    console.error('❌ Build output directory not found');
    process.exit(1);
  }

  console.log('\n🎉 Build completed successfully!');

} catch (error) {
  console.error('\n💥 Build failed with error:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}