# Professional QMS - Quality Management System

A comprehensive, automotive-compliant Quality Management System supporting Process Flow, FMEA, Control Plans, Change Management, Risk Analytics, and Compliance Reporting.

## 🚀 Features

### Core Modules
- **Process Flow Management** - Visual process mapping and step management
- **FMEA (Failure Mode and Effects Analysis)** - Complete AIAG-VDA compliant FMEA workflows
- **Control Plans** - Automotive standard control plan management
- **Change Management** - Version control, approval workflows, and change tracking
- **Risk Analytics** - Advanced risk analysis with trend monitoring and heat maps
- **Compliance Reporting** - IATF 16949, AIAG-VDA, and ISO 9001 compliance

### Advanced Features (Phase 5)
- **Professional PDF Reports** - Automotive-standard FMEA worksheets and executive summaries
- **Excel Export/Import** - Multi-worksheet exports and validated imports
- **Advanced Search** - Cross-module search with filtering and faceting
- **Bulk Operations** - Mass editing, assignment, and data management
- **Real-time Collaboration** - Comments, notifications, and team workspace
- **Predictive Analytics** - Trend analysis and risk prediction
- **Automotive Standards** - IATF 16949 templates and compliance assessment

## 📋 Prerequisites

- **Node.js** 18.0.0 or higher
- **PostgreSQL** 14.0 or higher
- **npm** or **yarn** package manager
- **Git** for version control

## 🛠️ Local Development Setup

### 1. Clone and Install

```bash
# Navigate to your project directory
cd "C:\Users\jdiaz\OneDrive - ATEK Metal Technologies LLC\Apps\FMEA app"

# Install backend dependencies
cd packages/backend
npm install

# Install additional dependencies for Phase 5 features
npm install pdfkit exceljs nodemailer express-rate-limit helmet cors
npm install --save-dev @types/pdfkit @types/nodemailer

# Install frontend dependencies (if you have a frontend)
cd ../frontend
npm install
```

### 2. Environment Configuration

Create `.env` file in `packages/backend/`:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/qms_development"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-here"

# Server Configuration
PORT=8000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:3000"
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"

# Email Configuration (Optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM="QMS System <noreply@qms.local>"

# File Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=pdf,xlsx,csv,png,jpg,jpeg

# Redis Configuration (Optional - for caching)
REDIS_URL="redis://localhost:6379"

# Logging Configuration
LOG_LEVEL=debug
LOG_FILE=logs/qms.log
```

### 3. Database Setup

#### Install PostgreSQL
```bash
# Windows (using chocolatey)
choco install postgresql

# Or download from https://www.postgresql.org/download/windows/
```

#### Create Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE qms_development;
CREATE USER qms_user WITH ENCRYPTED PASSWORD 'qms_password';
GRANT ALL PRIVILEGES ON DATABASE qms_development TO qms_user;

# Exit PostgreSQL
\q
```

#### Update your DATABASE_URL in .env:
```env
DATABASE_URL="postgresql://qms_user:qms_password@localhost:5432/qms_development"
```

### 4. Database Migration

```bash
cd packages/backend

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Seed database with sample data (optional)
npx prisma db seed
```

### 5. Create Required Directories

```bash
# From packages/backend directory
mkdir -p uploads logs backups temp

# Set appropriate permissions
# Windows: Right-click folders -> Properties -> Security -> Give full control to your user
```

### 6. Start the Development Server

```bash
cd packages/backend

# Start in development mode with hot reload
npm run dev

# Or start normally
npm start
```

The server should start on `http://localhost:8000`

## License

UNLICENSED - ATEK Metal Technologies LLC# Trigger deployment
