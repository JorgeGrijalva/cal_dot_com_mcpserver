FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json first for better caching
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Build the project
RUN npm run build

FROM node:20-alpine AS release

WORKDIR /app

# Copy only what's needed from the builder stage
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json

ENV NODE_ENV=production

# Install production dependencies only
RUN npm ci --omit=dev

# Set appropriate permissions
RUN chmod +x /app/dist/index.js

ENTRYPOINT ["node", "/app/dist/index.js"]