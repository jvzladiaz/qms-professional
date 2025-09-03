# Development Guide

This guide covers the development workflow for the QMS Automotive application.

## Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Docker and Docker Compose
- Git

## Initial Setup

1. **Clone and setup project:**
   ```bash
   git clone <repository-url>
   cd qms-automotive
   node scripts/setup.js
   ```

2. **Configure environment:**
   - Copy `.env.example` to `.env`
   - Update database and other configuration values

3. **Start development environment:**
   ```bash
   # Start databases
   npm run docker:up
   
   # Run migrations
   npm run db:migrate
   
   # Seed database
   npm run db:seed
   
   # Start development servers
   npm run dev
   ```

## Project Structure

```
qms-automotive/
├── packages/
│   ├── frontend/          # React frontend application
│   ├── backend/           # Node.js API server
│   ├── shared/            # Shared types and utilities
│   └── database/          # Database schemas and migrations
├── docker/                # Docker configuration
├── docs/                  # Documentation
└── scripts/               # Build and setup scripts
```

## Development Workflow

### Frontend Development

The frontend is built with React 18, TypeScript, and Material-UI:

- **Location:** `packages/frontend/`
- **Dev server:** `npm run dev:frontend`
- **Build:** `npm run build:frontend`
- **URL:** http://localhost:5173

Key directories:
- `src/components/` - Reusable UI components
- `src/pages/` - Page components
- `src/services/` - API service functions
- `src/hooks/` - Custom React hooks
- `src/utils/` - Utility functions

### Backend Development

The backend is a Node.js Express API with TypeScript:

- **Location:** `packages/backend/`
- **Dev server:** `npm run dev:backend`
- **Build:** `npm run build:backend`
- **URL:** http://localhost:3001

Key directories:
- `src/routes/` - API route handlers
- `src/controllers/` - Business logic controllers
- `src/services/` - Service layer
- `src/middleware/` - Express middleware
- `src/models/` - Database models (Prisma)

### Database Development

Using Prisma ORM with PostgreSQL:

- **Schema:** `packages/database/schema.prisma`
- **Migrations:** `packages/database/migrations/`
- **Seeds:** `packages/database/seeds/`

Common commands:
```bash
# Generate Prisma client
npm run db:generate

# Create and run migration
npm run migrate:dev --workspace=database

# Reset database
npm run reset --workspace=database

# Open Prisma Studio
npm run db:studio --workspace=database
```

### Shared Package

Contains shared TypeScript types and utilities:

- **Location:** `packages/shared/`
- **Build:** `npm run build --workspace=shared`

This package is used by both frontend and backend applications.

## Code Standards

### TypeScript

- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use enums for constants with multiple values
- Avoid `any` type; use `unknown` if necessary

### React

- Use functional components with hooks
- Follow the hooks rules of React
- Prefer composition over inheritance
- Use TypeScript for prop types

### Node.js

- Use async/await over Promises
- Handle errors properly with try/catch
- Use middleware for cross-cutting concerns
- Follow RESTful API conventions

### Database

- Use meaningful names for tables and columns
- Follow Prisma naming conventions
- Create proper indexes for performance
- Use migrations for schema changes

## Testing

### Frontend Tests

Using Vitest and React Testing Library:

```bash
npm run test --workspace=frontend
```

### Backend Tests

Using Vitest:

```bash
npm run test --workspace=backend
```

### Integration Tests

Run all tests:

```bash
npm test
```

## Docker Development

### Development Services

Start only databases for local development:

```bash
docker-compose up postgres redis pgadmin
```

### Full Environment

Start complete dockerized environment:

```bash
docker-compose --profile production up
```

## Debugging

### Frontend Debugging

1. Use React DevTools browser extension
2. Use browser debugger with source maps
3. Check console for errors and warnings

### Backend Debugging

1. Use VS Code debugger with Node.js
2. Add breakpoints in TypeScript files
3. Check application logs

### Database Debugging

1. Use Prisma Studio: `npm run db:studio`
2. Use pgAdmin: http://localhost:5050
3. Check PostgreSQL logs in Docker

## Performance

### Frontend Optimization

- Use React.memo for expensive components
- Implement proper loading states
- Optimize bundle size with code splitting
- Use Material-UI's built-in optimizations

### Backend Optimization

- Use database indexes effectively
- Implement caching with Redis
- Monitor API response times
- Use connection pooling

### Database Optimization

- Create appropriate indexes
- Monitor query performance
- Use database views for complex queries
- Regular maintenance and statistics updates

## Deployment

### Development

Use Docker Compose for local development environment.

### Production

1. Build all packages: `npm run build`
2. Use Docker multi-stage builds
3. Set appropriate environment variables
4. Use reverse proxy (Nginx) for routing
5. Monitor application health

## Troubleshooting

### Common Issues

1. **Port conflicts:** Change ports in docker-compose.yml
2. **Database connection:** Check DATABASE_URL in .env
3. **Build failures:** Clear node_modules and reinstall
4. **Type errors:** Run `npm run type-check` in all packages

### Getting Help

1. Check application logs
2. Review database logs in Docker
3. Verify environment configuration
4. Check network connectivity between services