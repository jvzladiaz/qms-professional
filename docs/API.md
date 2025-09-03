# API Documentation

This document describes the REST API endpoints for the QMS Automotive application.

## Base URL

```
http://localhost:3001/api
```

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt-token>
```

## Common Response Format

All API responses follow this format:

```json
{
  "success": boolean,
  "data": any,
  "message": string,
  "timestamp": string,
  "pagination": {
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number,
    "hasNext": boolean,
    "hasPrev": boolean
  }
}
```

## Process Flow API

### Get Process Flows

```http
GET /api/process-flow
```

Query Parameters:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `search` (string): Search term
- `status` (string): Filter by status
- `priority` (string): Filter by priority

### Get Process Flow by ID

```http
GET /api/process-flow/:id
```

### Create Process Flow

```http
POST /api/process-flow
Content-Type: application/json

{
  "name": "string",
  "description": "string",
  "version": "string",
  "priority": "LOW|MEDIUM|HIGH|CRITICAL",
  "productLine": "string",
  "partId": "string"
}
```

### Update Process Flow

```http
PUT /api/process-flow/:id
Content-Type: application/json

{
  "name": "string",
  "description": "string",
  "status": "DRAFT|IN_REVIEW|APPROVED|ACTIVE|INACTIVE|ARCHIVED"
}
```

### Delete Process Flow

```http
DELETE /api/process-flow/:id
```

## FMEA API

### Get FMEAs

```http
GET /api/fmea
```

Query Parameters:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `type` (string): DESIGN|PROCESS|SYSTEM
- `status` (string): Filter by status
- `priority` (string): Filter by priority

### Get FMEA by ID

```http
GET /api/fmea/:id
```

### Create FMEA

```http
POST /api/fmea
Content-Type: application/json

{
  "name": "string",
  "description": "string",
  "type": "DESIGN|PROCESS|SYSTEM",
  "methodology": "AIAG_VDA|AIAG_4TH|IEC_60812",
  "version": "string",
  "priority": "LOW|MEDIUM|HIGH|CRITICAL",
  "productLine": "string",
  "part": "string",
  "process": "string"
}
```

### Update FMEA

```http
PUT /api/fmea/:id
Content-Type: application/json

{
  "name": "string",
  "status": "DRAFT|IN_REVIEW|APPROVED|ACTIVE|INACTIVE|ARCHIVED"
}
```

### Delete FMEA

```http
DELETE /api/fmea/:id
```

### Get Failure Modes

```http
GET /api/fmea/:id/failure-modes
```

### Create Failure Mode

```http
POST /api/fmea/:id/failure-modes
Content-Type: application/json

{
  "item": "string",
  "function": "string",
  "functionalRequirement": "string",
  "failureMode": "string",
  "effectsLocal": "string",
  "effectsHigher": "string",
  "effectsEnd": "string",
  "cause": "string",
  "preventionControl": "string",
  "detectionControl": "string",
  "preventionType": "DESIGN|PROCESS|INSPECTION|TEST|VALIDATION|NONE",
  "detectionType": "DESIGN|PROCESS|INSPECTION|TEST|VALIDATION|NONE",
  "severity": number,
  "occurrence": number,
  "detection": number
}
```

## Control Plan API

### Get Control Plans

```http
GET /api/control-plan
```

Query Parameters:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `planType` (string): PROTOTYPE|PRE_LAUNCH|PRODUCTION
- `status` (string): Filter by status

### Get Control Plan by ID

```http
GET /api/control-plan/:id
```

### Create Control Plan

```http
POST /api/control-plan
Content-Type: application/json

{
  "name": "string",
  "description": "string",
  "version": "string",
  "priority": "LOW|MEDIUM|HIGH|CRITICAL",
  "productLine": "string",
  "part": "string",
  "process": "string",
  "planType": "PROTOTYPE|PRE_LAUNCH|PRODUCTION"
}
```

### Update Control Plan

```http
PUT /api/control-plan/:id
Content-Type: application/json

{
  "name": "string",
  "status": "DRAFT|IN_REVIEW|APPROVED|ACTIVE|INACTIVE|ARCHIVED"
}
```

### Delete Control Plan

```http
DELETE /api/control-plan/:id
```

### Get Control Points

```http
GET /api/control-plan/:id/control-points
```

### Create Control Point

```http
POST /api/control-plan/:id/control-points
Content-Type: application/json

{
  "sequenceNumber": number,
  "processStep": "string",
  "characteristic": "string",
  "nominal": number,
  "lowerLimit": number,
  "upperLimit": number,
  "unit": "string",
  "specType": "VARIABLE|ATTRIBUTE|VISUAL",
  "controlMethodType": "SPC|INSPECTION|FUNCTIONAL_TEST|VISUAL_INSPECTION|MEASUREMENT|GO_NO_GO|ATTRIBUTE_CHECK",
  "controlMethodDescription": "string",
  "sampleSize": number,
  "frequency": "string",
  "frequencyType": "CONTINUOUS|PERIODIC|BATCH|LOT|SHIFT|HOURLY|DAILY|SETUP",
  "responsibleRole": "string"
}
```

## Authentication API

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "string",
  "password": "string"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "string",
    "user": {
      "id": "string",
      "email": "string",
      "firstName": "string",
      "lastName": "string",
      "role": "string"
    }
  }
}
```

### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "string",
  "password": "string",
  "firstName": "string",
  "lastName": "string",
  "department": "string"
}
```

### Refresh Token

```http
POST /api/auth/refresh
Authorization: Bearer <jwt-token>
```

### Logout

```http
POST /api/auth/logout
Authorization: Bearer <jwt-token>
```

## User API

### Get Current User

```http
GET /api/users/me
Authorization: Bearer <jwt-token>
```

### Update User Profile

```http
PUT /api/users/me
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "firstName": "string",
  "lastName": "string",
  "department": "string"
}
```

### Get Users

```http
GET /api/users
Authorization: Bearer <jwt-token>
```

Query Parameters:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `role` (string): Filter by role
- `department` (string): Filter by department
- `isActive` (boolean): Filter by active status

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "error": {
    "message": "Validation error",
    "status": 400,
    "details": {
      "field": "email",
      "message": "Invalid email format"
    }
  }
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "error": {
    "message": "Unauthorized access",
    "status": 401
  }
}
```

### 403 Forbidden

```json
{
  "success": false,
  "error": {
    "message": "Insufficient permissions",
    "status": 403
  }
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": {
    "message": "Resource not found",
    "status": 404
  }
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": {
    "message": "Internal server error",
    "status": 500
  }
}
```

## Rate Limiting

API endpoints are rate limited:
- General endpoints: 100 requests per minute
- Authentication endpoints: 10 requests per minute

## Pagination

Paginated responses include pagination metadata:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## File Upload

For endpoints that accept file uploads, use multipart/form-data:

```http
POST /api/attachments
Content-Type: multipart/form-data
Authorization: Bearer <jwt-token>

file=<file-data>
entityId=<string>
entityType=<string>
```

Supported file types: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, JPEG, GIF
Maximum file size: 10MB