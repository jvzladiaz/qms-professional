# Backend Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules

# Build shared package first
RUN npm run build --workspace=shared

# Build backend
RUN npm run build --workspace=backend

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 qmsuser

# Copy built application
COPY --from=builder --chown=qmsuser:nodejs /app/packages/backend/dist ./dist
COPY --from=builder --chown=qmsuser:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=deps --chown=qmsuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=qmsuser:nodejs /app/packages/backend/package.json ./package.json

# Create uploads directory
RUN mkdir -p uploads && chown qmsuser:nodejs uploads

USER qmsuser

EXPOSE 3001

ENV PORT 3001

CMD ["node", "dist/index.js"]