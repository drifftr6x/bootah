# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/drizzle.config.ts ./

# Copy PXE files if they exist
COPY --from=builder /app/pxe-files ./pxe-files

# Create non-root user
RUN addgroup -g 1000 bootah && \
    adduser -D -u 1000 -G bootah bootah && \
    mkdir -p /app/images /app/logs /app/data && \
    chown -R bootah:bootah /app

USER bootah

# Expose ports
# 5000 - HTTP/Web UI
# 6969 - TFTP (UDP)
# 4067 - DHCP Proxy (UDP)
EXPOSE 5000 6969/udp 4067/udp

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/server-status || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/index.js"]
