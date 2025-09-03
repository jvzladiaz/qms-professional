#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up QMS Automotive project...\n');

// Check if .env exists, if not copy from .env.example
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  console.log('📝 Creating .env file from .env.example...');
  fs.copyFileSync(envExamplePath, envPath);
  console.log('✅ .env file created\n');
}

// Install dependencies
console.log('📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed\n');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Generate Prisma client
console.log('🔄 Generating Prisma client...');
try {
  execSync('npm run db:generate --workspace=database', { stdio: 'inherit' });
  console.log('✅ Prisma client generated\n');
} catch (error) {
  console.warn('⚠️  Failed to generate Prisma client. Run manually after setting up database.');
}

// Build shared package
console.log('🔨 Building shared package...');
try {
  execSync('npm run build --workspace=shared', { stdio: 'inherit' });
  console.log('✅ Shared package built\n');
} catch (error) {
  console.error('❌ Failed to build shared package:', error.message);
  process.exit(1);
}

console.log('🎉 Setup completed successfully!\n');
console.log('Next steps:');
console.log('1. Update the .env file with your database credentials');
console.log('2. Start the database: npm run docker:up');
console.log('3. Run database migrations: npm run db:migrate');
console.log('4. Seed the database: npm run db:seed');
console.log('5. Start development: npm run dev');
console.log('\nFor more information, see README.md');