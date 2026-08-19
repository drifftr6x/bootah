# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the application and migration runner. npx resolves the project-local esbuild binary.
RUN npm run build && npx esbuild server/migrate.ts --platform=node --packages=external --bundle --format=esm --define:process.env.NODE_ENV="\"production\"" --outfile=dist/migrate.js

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling and wget for the healthcheck.
RUN apk add --no-cache dumb-init wget

# Copy built application and package files only
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/pxe-files ./pxe-files

# Create directories
RUN mkdir -p /app/images /app/logs /app/data

# Install production dependencies only
RUN npm ci --legacy-peer-deps --omit=dev

# Phase 1 safe baseline exposes only the HTTP application port.
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/index.js"]
