# AIVO API Dockerfile
# Builds a development container for the Cloudflare Workers API

FROM node:24-alpine

# Install system dependencies for Rust/wasm-pack and native modules
RUN apk add --no-cache \
    bash \
    curl \
    g++ \
    gcc \
    libc6-compat \
    make \
    python3 \
    git \
    pkgconfig \
    openssl-dev

# Install Rust
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y --default-toolchain stable
ENV PATH="/root/.cargo/bin:${PATH}"

# Verify Rust installation
RUN rustc --version && cargo --version

# Install wasm-pack
RUN cargo install wasm-pack

# Install pnpm
RUN npm install -g pnpm@10.33.0

# Set working directory
WORKDIR /app

# Copy root configuration files first (for better caching)
COPY package.json pnpm-lock.yaml ./
COPY packages/db/package.json packages/db/
COPY packages/aivo-compute/package.json packages/aivo-compute/
COPY packages/infographic-generator/package.json packages/infographic-generator/
COPY packages/memory-service/package.json packages/memory-service/
COPY packages/optimizer/package.json packages/optimizer/
COPY packages/excel-export/package.json packages/excel-export/
COPY packages/body-compute/package.json packages/body-compute/
COPY packages/email-reporter/package.json packages/email-reporter/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/api-client/package.json packages/api-client/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/jest-config/package.json packages/jest-config/

# Install monorepo dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Build WASM packages
RUN pnpm run build:wasm

# Copy wrangler configuration
COPY apps/api/wrangler.toml apps/api/

# Expose the default wrangler dev port
EXPOSE 8787

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://localhost:8787/health || exit 1

# Start the development server
CMD ["pnpm", "--filter", "@aivo/api", "run", "dev", "--local"]
