# AIVO Web Dockerfile
# Builds a development container for the Next.js Web App

FROM node:24-alpine

# Install dependencies for native modules
RUN apk add --no-cache \
    bash \
    curl \
    python3 \
    make \
    g++ \
    gcc \
    libc6-compat

# Install pnpm
RUN npm install -g pnpm@10.33.0

# Set working directory
WORKDIR /app

# Copy web package files
COPY apps/web/package.json apps/web/pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy the rest of the source code
COPY . .

# Expose the Next.js dev port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://localhost:3000 || exit 1

# Start the development server
CMD ["pnpm", "--filter", "@aivo/web", "run", "dev"]
