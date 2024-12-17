# Stage 1: Build Stage
FROM node:18-alpine AS build

# Set working directory
WORKDIR /nyf/service/backend

# Install dependencies and TypeScript
COPY package*.json ./
RUN npm install
RUN npm install -g typescript

# Copy source code and build    ----# Copies everything, including the certs folder
COPY . .    
RUN npm run build

# Stage 2: Runtime Stage
FROM node:18-alpine AS runtime

# Set working directory
WORKDIR /nyf/service/backend

# Install PM2 globally
RUN npm install -g pm2
RUN npm rebuild bcrypt --build-from-source

# Copy only necessary files from the build stage
COPY --from=build /nyf/service/backend/package*.json ./
COPY --from=build /nyf/service/backend/node_modules ./node_modules
COPY --from=build /nyf/service/backend/dist ./dist
COPY --from=build /nyf/service/backend/ecosystem.config.js ./ecosystem.config.js

# Copy the .env file from the build stage
COPY --from=build /nyf/service/backend/.env .env

# Copy the certs directory from the build context into the container
COPY --from=build /nyf/service/backend/certs /nyf/service/backend/certs 


# Correct the path for templates.json based on your structure
COPY --from=build /nyf/service/backend/src/templates.json /nyf/service/backend/dist/templates.json 

# Expose port
EXPOSE 5005

# Start the application using PM2
CMD ["pm2-runtime", "ecosystem.config.js", "--env", "dev"]
