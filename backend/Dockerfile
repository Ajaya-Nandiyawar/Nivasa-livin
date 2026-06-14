# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy dependency files
COPY package*.json ./

# Install dependencies (including devDependencies for compilation)
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Production environment
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# Copy dependency files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy compiled files and assets from build stage
COPY --from=builder /usr/src/app/dist ./dist

# Expose backend port
EXPOSE 3001

ENV PORT=3001
ENV NODE_ENV=production

# Command to run migrations first then start the application
CMD ["sh", "-c", "npm run migration:run && npm run start:prod"]
