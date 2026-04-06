ARG BUILD_DATE=unknown
ARG VCS_REF=unknown
ARG VERSION=1.0.0

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Set build arguments
ARG BUILD_DATE=unknown
ARG VCS_REF=unknown
ARG VERSION=1.0.0
ARG NEXT_PUBLIC_API_URL=http://localhost:8080

# Copy package files
COPY ["frontend/package.json", "./"]
COPY ["frontend/package-lock.json", "./"]

# Install dependencies (including dev for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY ["frontend/", "./"]

# Build Next.js application
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build && \
    if [ ! -d .next ]; then echo "Build failed: .next directory not found!" && exit 1; fi && \
    ls -la .next

# Runtime stage
FROM node:18-alpine AS runtime

# Re-declare build args for this stage (required for LABEL expansion)
ARG BUILD_DATE=unknown
ARG VCS_REF=unknown
ARG VERSION=1.0.0

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy built application from builder
COPY --from=builder --chown=appuser:appgroup /app/.next /app/.next
COPY --from=builder --chown=appuser:appgroup /app/node_modules /app/node_modules
COPY --from=builder --chown=appuser:appgroup /app/public /app/public
COPY --from=builder --chown=appuser:appgroup /app/package.json /app/package.json

# Set environment variables
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Change to non-root user
USER appuser

# Use dumb-init as entrypoint
ENTRYPOINT ["dumb-init", "--"]

# Run the application
CMD ["npm", "start"]

# Add metadata labels
LABEL org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.title="DataModeler Frontend" \
      org.opencontainers.image.description="Production-grade data modeling platform frontend" \
      org.opencontainers.image.vendor="DataModeler"
