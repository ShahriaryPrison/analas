# Stage 1: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Define the registry variables with defaults
ARG NPM_REGISTRY=https://registry.npmjs.org/
ARG PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma

# Apply whichever registries are passed in
RUN npm config set registry ${NPM_REGISTRY}
ENV PRISMA_ENGINES_MIRROR=${PRISMA_ENGINES_MIRROR}
ENV PRISMA_BINARIES_MIRROR=${PRISMA_ENGINES_MIRROR}

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