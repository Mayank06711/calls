# ── Stage 1: Build static assets ──
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build args become VITE env vars at build time
ARG VITE_API_URL
ARG VITE_API_BASE_URL
ARG VITE_API_VERSION=v1
ARG VITE_ENV=production
ARG VITE_PYTHON_SERVICE_URL

ENV VITE_API_URL=$VITE_API_URL \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_API_VERSION=$VITE_API_VERSION \
    VITE_ENV=$VITE_ENV \
    VITE_PYTHON_SERVICE_URL=$VITE_PYTHON_SERVICE_URL

RUN npm run build

# ── Stage 2: Serve with nginx ──
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
