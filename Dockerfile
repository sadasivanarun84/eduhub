FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev deps for tsx)
RUN npm ci

# Copy source code
COPY . .

# Build client-side assets
RUN npm run build

# Expose port (Cloud Run will set PORT env var)
EXPOSE 8080

# Start with tsx directly
CMD ["npm", "start"]