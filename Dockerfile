# Stage 1: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Define the registry variables with defaults
ARG NPM_REGISTRY=https://registry.npmjs.org/

# Apply whichever registries are passed in
RUN npm config set registry ${NPM_REGISTRY}

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of your application code
COPY . .

# 1. Make the Linux engine executable
RUN chmod +x ./prisma/engines/schema-engine

# 2. Tell Prisma exactly where the schema engine is so it completely skips downloading
ENV PRISMA_SCHEMA_ENGINE_BINARY=/app/prisma/engines/schema-engine

# 3. Generate the client (It will now be instant and require no internet)
RUN npx prisma generate

# Build the Next.js app
RUN npm run build

# Stage 2: Run the production server
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy only the strictly necessary files from builder
COPY --from=builder /app/public ./public

# The standalone folder contains a minimal node_modules and a custom server.js
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma so it's available for database access
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# Standalone mode uses server.js instead of 'npm run start'
CMD ["node", "server.js"]