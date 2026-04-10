# ── Stage 1: Build TypeScript ──
FROM node:18-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm config set fetch-timeout 600000 && \
    npm config set fetch-retries 5 && \
    npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ── Stage 2: Prod deps only (single layer, no build tools in final) ──
FROM node:18-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN apk add --no-cache python3 make g++ && \
    npm config set fetch-timeout 600000 && \
    npm config set fetch-retries 5 && \
    npm ci --omit=dev && \
    npm rebuild bcrypt --build-from-source && \
    # Strip bloat from node_modules
    find node_modules -name "*.md" -o -name "*.map" -o -name "LICENSE*" -o -name "CHANGELOG*" | xargs rm -f 2>/dev/null; \
    find node_modules -type d \( -name "test" -o -name "tests" -o -name "docs" -o -name "example" -o -name "examples" \) -exec rm -rf {} + 2>/dev/null; \
    rm -rf node_modules/@types 2>/dev/null; \
    # geoip-lite data is 154MB — remove it, lookup will gracefully return null
    rm -rf node_modules/geoip-lite/data 2>/dev/null; \
    true

# ── Stage 3: Final minimal image ──
FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache tini && adduser -D -H appuser

# Copy only what's needed — no build tools, no source
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./
COPY src/templates.json ./dist/templates.json

# SQLite master DBs
COPY fashion_master.db consultant_master.db \
     footwear_master.db layering_master.db ./

ENV NODE_ENV=production PORT=5005
EXPOSE 5005
USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "const h=require('http');h.get('http://localhost:5005/system/_status/health_check',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/index.js"]
