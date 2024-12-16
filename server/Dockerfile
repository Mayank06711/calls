# Use Node.js official image as the base
FROM node:18

# Set the working directory inside the container
WORKDIR /nyf/service/backend

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies and PM2 globally
RUN npm install
RUN npm install -g pm2

# Copy all code
COPY . .

# Install TypeScript globally and build the project
RUN npm install -g typescript
RUN npm run build

# Expose the application's port
EXPOSE 3003

# Start the application using PM2
CMD ["pm2-runtime", "ecosystem.config.js", "--env", "dev"]
