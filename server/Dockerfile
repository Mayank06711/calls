# Stage 1: Build Stage
FROM node:18-alpine AS build

# Set working directory
WORKDIR /nyf/service/backend

# Install dependencies and TypeScript
COPY package*.json ./
RUN npm install
RUN npm install -g typescript

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Runtime Stage
FROM node:18-alpine AS runtime

# Set working directory
WORKDIR /nyf/service/backend

# Install PM2 globally
RUN npm install -g pm2

# Copy only necessary files from the build stage
COPY --from=build /nyf/service/backend/package*.json ./
COPY --from=build /nyf/service/backend/node_modules ./node_modules
COPY --from=build /nyf/service/backend/dist ./dist
COPY --from=build /nyf/service/backend/ecosystem.config.js ./ecosystem.config.js

# Expose port
EXPOSE 3003

# Start the application using PM2
CMD ["pm2-runtime", "ecosystem.config.js", "--env", "dev"]
