# Stage 1: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Define the registry variable with the standard NPM default
ARG NPM_REGISTRY=https://registry.npmjs.org/

# Apply whichever registry is passed in
RUN npm config set registry ${NPM_REGISTRY}

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of your application code
COPY . .

# Generate the Prisma Client
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