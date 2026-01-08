# Multi-stage build for optimized Bun application
FROM oven/bun:1 AS base

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source code
COPY src ./src
COPY public ./public
COPY tsconfig.json biome.json ./

# Build standalone executable
RUN bun build src/index.ts --compile --outfile=app

# Production stage - minimal distroless image
FROM gcr.io/distroless/base-debian12:latest AS production

# Copy compiled executable and static assets
COPY --from=base --chown=nonroot:nonroot /app/app /app/app
COPY --chown=nonroot:nonroot public /app/public

WORKDIR /app

# Switch to non-root user
USER nonroot:nonroot

# Expose port (default 3000, configurable via PORT env var)
EXPOSE 3000

# Start application
CMD ["/app/app"]
