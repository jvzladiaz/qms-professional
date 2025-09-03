#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up QMS Professional System locally...\n');

// Create directories
const directories = ['uploads', 'logs', 'backups', 'temp'];
directories.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  } else {
    console.log(`📁 Directory already exists: ${dir}`);
  }
});

// Check if .env exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created .env file from .env.example');
    console.log('⚠️  Please update the .env file with your database credentials');
  } else {
    // Create a basic .env file
    const envContent = `# Database Configuration
DATABASE_URL="postgresql://qms_user:qms_password@localhost:5432/qms_development"

# JWT Secret (change this!)
JWT_SECRET="your-super-secret-jwt-key-change-this-${Math.random().toString(36).substring(7)}"

# Server Configuration
PORT=8000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:3000"
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001,http://localhost:5173"

# Logging Configuration
LOG_LEVEL=debug
LOG_FILE=logs/qms.log

# Feature Flags
ENABLE_PDF_GENERATION=true
ENABLE_EXCEL_EXPORT=true
ENABLE_ADVANCED_ANALYTICS=true
ENABLE_NOTIFICATIONS=true
ENABLE_WEBSOCKETS=true
`;
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created basic .env file');
    console.log('⚠️  Please update the DATABASE_URL with your PostgreSQL credentials');
  }
} else {
  console.log('📄 .env file already exists');
}

// Check if PostgreSQL is accessible
try {
  console.log('\n🔍 Checking PostgreSQL connection...');
  execSync('pg_isready', { stdio: 'pipe' });
  console.log('✅ PostgreSQL is running');
} catch (error) {
  console.log('⚠️  PostgreSQL is not running or not accessible');
  console.log('   Please install and start PostgreSQL:');
  console.log('   - Windows: choco install postgresql');
  console.log('   - Or download from https://www.postgresql.org/download/');
}

// Check if Prisma is set up
try {
  const prismaSchemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
  if (fs.existsSync(prismaSchemaPath)) {
    console.log('✅ Prisma schema found');
  } else {
    console.log('⚠️  Prisma schema not found');
    console.log('   You may need to set up the database schema');
  }
} catch (error) {
  console.log('⚠️  Error checking Prisma setup');
}

console.log('\n📝 Next steps:');
console.log('1. Update the .env file with your database credentials');
console.log('2. Create the PostgreSQL database:');
console.log('   psql -U postgres -c "CREATE DATABASE qms_development;"');
console.log('3. Install dependencies:');
console.log('   npm install');
console.log('4. Generate Prisma client:');
console.log('   npx prisma generate');
console.log('5. Run database migrations:');
console.log('   npx prisma migrate dev --name init');
console.log('6. Start the development server:');
console.log('   npm run dev');

console.log('\n🎯 The server will be available at: http://localhost:8000');
console.log('🔧 Health check endpoint: http://localhost:8000/api/health');

console.log('\n✨ Setup complete! Your professional QMS system is ready for testing.');