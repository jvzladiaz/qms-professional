# QMS Professional - Local Testing Guide

This guide will help you test the comprehensive QMS system with all Phase 5 advanced features locally.

## 🚀 Quick Start

### 1. **Prerequisites Check**

```bash
# Check Node.js version (should be 18+)
node --version

# Check PostgreSQL installation
pg_isready

# Check if ports are available
netstat -an | findstr :8000
netstat -an | findstr :5432
```

### 2. **Initial Setup**

```bash
# Navigate to backend
cd "C:\Users\jdiaz\OneDrive - ATEK Metal Technologies LLC\Apps\FMEA app\packages\backend"

# Run setup script
node setup-local.js

# Install dependencies
npm install

# Copy environment file
copy .env.example .env

# Edit .env with your database credentials
notepad .env
```

### 3. **Database Setup**

```bash
# Connect to PostgreSQL as superuser
psql -U postgres

# Create database and user
CREATE DATABASE qms_development;
CREATE USER qms_user WITH ENCRYPTED PASSWORD 'qms_password';
GRANT ALL PRIVILEGES ON DATABASE qms_development TO qms_user;
\q

# Update .env with your database URL
# DATABASE_URL="postgresql://qms_user:qms_password@localhost:5432/qms_development"
```

### 4. **Database Migration**

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name "init_qms_professional"

# View database (optional)
npx prisma studio
```

### 5. **Start the Server**

```bash
# Development mode with hot reload
npm run dev

# Or regular start
npm start
```

**Expected Output:**
```
🚀 QMS Professional System starting...
📡 Server running on http://localhost:8000
🏥 Health check: http://localhost:8000/api/health
📊 System status: http://localhost:8000/api/system/status
🎯 Features enabled:
   - PDF Generation: ✅
   - Excel Export: ✅
   - Advanced Analytics: ✅
   - Notifications: ✅
   - WebSockets: ✅

🎉 QMS Professional System is ready for testing!
```

## 🧪 Testing the System

### **Step 1: Health Check**

```bash
curl http://localhost:8000/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "core": { "status": "HEALTHY" },
    "reporting": { "status": "HEALTHY" }
  },
  "version": "5.0.0",
  "features": {
    "pdfGeneration": true,
    "excelExport": true,
    "advancedAnalytics": true
  }
}
```

### **Step 2: System Capabilities**

```bash
curl http://localhost:8000/api/system/status
```

This shows all available QMS features and system status.

### **Step 3: Setup Test Data**

```bash
curl -X POST http://localhost:8000/api/test/setup \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Test environment set up successfully",
  "data": {
    "user": {
      "id": "user-id",
      "email": "test@example.com",
      "name": "Test User"
    },
    "project": {
      "id": "project-id",
      "name": "Test Automotive Project"
    }
  }
}
```

### **Step 4: API Documentation**

```bash
curl http://localhost:8000/api/docs
```

This returns a complete list of available endpoints.

## 🔍 Advanced Feature Testing

### **Phase 5 Features Testing**

#### **1. Professional PDF Reports**
```bash
# Test executive summary (replace PROJECT_ID with actual ID from setup)
curl -X GET "http://localhost:8000/api/reports/executive/PROJECT_ID" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -o "executive-report.pdf"

# Test FMEA worksheet PDF
curl -X GET "http://localhost:8000/api/reports/fmea/FMEA_ID" \
  -o "fmea-worksheet.pdf"
```

#### **2. Excel Export/Import**
```bash
# Export project to Excel
curl -X GET "http://localhost:8000/api/exports/project/PROJECT_ID" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -o "project-export.xlsx"

# Get import templates
curl -X GET "http://localhost:8000/api/imports/templates" \
  -o "import-templates.xlsx"
```

#### **3. Advanced Search**
```bash
# Global search across all modules
curl -X POST http://localhost:8000/api/search/global \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -d '{
    "query": "test",
    "filters": {
      "entityTypes": ["FMEA", "PROCESS_FLOW"],
      "riskLevel": ["HIGH", "CRITICAL"]
    },
    "options": {
      "limit": 20,
      "includeRelated": true
    }
  }'
```

#### **4. Advanced Analytics**
```bash
# Get risk trend analysis
curl -X GET "http://localhost:8000/api/analytics/trends/PROJECT_ID" \
  -H "Authorization: Bearer JWT_TOKEN"

# Get risk heat map
curl -X GET "http://localhost:8000/api/analytics/heatmap/PROJECT_ID" \
  -H "Authorization: Bearer JWT_TOKEN"

# Get predictive insights
curl -X GET "http://localhost:8000/api/analytics/predictions/PROJECT_ID" \
  -H "Authorization: Bearer JWT_TOKEN"
```

#### **5. IATF 16949 Compliance**
```bash
# Run compliance assessment
curl -X POST "http://localhost:8000/api/compliance/iatf16949/assess/PROJECT_ID" \
  -H "Authorization: Bearer JWT_TOKEN"

# Get compliance report
curl -X GET "http://localhost:8000/api/compliance/report/PROJECT_ID" \
  -H "Authorization: Bearer JWT_TOKEN"
```

#### **6. Bulk Operations**
```bash
# Bulk update failure modes
curl -X POST http://localhost:8000/api/bulk/update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -d '{
    "entityType": "FAILURE_MODE",
    "entityIds": ["id1", "id2", "id3"],
    "updates": {
      "status": "REVIEWED"
    },
    "userId": "USER_ID",
    "reason": "Bulk status update for review"
  }'
```

#### **7. WebSocket Testing**

Create a file `test-websocket.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>QMS WebSocket Test</title>
    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
</head>
<body>
    <h1>QMS WebSocket Test</h1>
    <div id="status">Disconnected</div>
    <div id="messages"></div>

    <script>
        const socket = io('http://localhost:8000', {
            auth: {
                token: 'your-jwt-token-here'
            }
        });

        socket.on('connect', () => {
            document.getElementById('status').textContent = 'Connected';
            console.log('Connected to QMS WebSocket');
        });

        socket.on('changeEvent', (data) => {
            console.log('Change event:', data);
            document.getElementById('messages').innerHTML += 
                `<p><strong>Change:</strong> ${JSON.stringify(data)}</p>`;
        });

        socket.on('notification', (data) => {
            console.log('Notification:', data);
            document.getElementById('messages').innerHTML += 
                `<p><strong>Notification:</strong> ${JSON.stringify(data)}</p>`;
        });
    </script>
</body>
</html>
```

Open this file in a browser to test WebSocket connections.

## 📊 Performance Testing

### **Load Testing**
```bash
# Install Apache Bench (if not available)
# Windows: choco install httpie

# Test health endpoint
ab -n 100 -c 10 http://localhost:8000/api/health

# Test system status
ab -n 50 -c 5 http://localhost:8000/api/system/status
```

### **Memory and CPU Monitoring**
The system logs memory usage and performance metrics. Check:
- Console output for performance logs
- `logs/qms.log` for detailed logging
- System status endpoint for real-time metrics

## 🔧 Troubleshooting

### **Common Issues**

#### **Database Connection Failed**
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Check database exists
psql -U qms_user -d qms_development -c "SELECT 1;"

# Check .env file
cat .env | grep DATABASE_URL
```

#### **Port Already in Use**
```bash
# Find process using port 8000
netstat -ano | findstr :8000

# Kill the process (Windows)
taskkill /PID <PID> /F
```

#### **Missing Dependencies**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Check for specific missing packages
npm list pdfkit exceljs nodemailer
```

#### **Permission Issues**
```bash
# Windows: Set folder permissions
icacls uploads /grant %USERNAME%:F /T
icacls logs /grant %USERNAME%:F /T
```

#### **Prisma Issues**
```bash
# Regenerate Prisma client
npx prisma generate

# Reset database (CAUTION: Deletes all data)
npx prisma migrate reset

# Check schema
npx prisma validate
```

## 📈 Testing Scenarios

### **Scenario 1: Complete FMEA Workflow**
1. Create a project
2. Add process flow
3. Create FMEA with failure modes
4. Generate risk analytics
5. Export PDF and Excel reports
6. Run compliance assessment

### **Scenario 2: Change Management**
1. Create baseline version
2. Make changes to FMEA
3. Track changes in real-time
4. Trigger approval workflow
5. Generate change impact report

### **Scenario 3: Collaboration**
1. Add comments to FMEA entries
2. Assign action items to users
3. Send notifications
4. Track user activity
5. Generate audit trail

### **Scenario 4: Bulk Operations**
1. Import data from Excel
2. Bulk update multiple records
3. Mass assign action items
4. Generate batch reports

## 📝 Testing Checklist

- [ ] Health check responds successfully
- [ ] Database connection established
- [ ] Test user and project created
- [ ] WebSocket connections working
- [ ] PDF report generation
- [ ] Excel export/import
- [ ] Advanced search functionality
- [ ] Risk analytics and heat maps
- [ ] IATF 16949 compliance assessment
- [ ] Notification system
- [ ] Bulk operations
- [ ] Comment system
- [ ] Change tracking
- [ ] Error handling
- [ ] Performance monitoring

## 🎯 Next Steps

Once basic testing is complete:

1. **Frontend Integration**: Connect your React frontend to the API
2. **User Authentication**: Implement login/logout workflows
3. **Data Creation**: Create realistic FMEA data for testing
4. **Workflow Testing**: Test complete business processes
5. **Performance Optimization**: Monitor and optimize system performance
6. **Production Deployment**: Prepare for production deployment

## 📞 Support

If you encounter issues:

1. Check the console output for error messages
2. Review `logs/qms.log` for detailed error logs
3. Verify all dependencies are installed correctly
4. Ensure PostgreSQL is running and accessible
5. Check the `.env` configuration file
6. Test individual endpoints with curl or Postman

**Your QMS Professional system is ready for comprehensive testing! 🚀**