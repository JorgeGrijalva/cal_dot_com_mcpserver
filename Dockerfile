FROM node:18-alpine AS builder

WORKDIR /app

# First copy both package.json and tsconfig.json
COPY package.json tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build the project
RUN npm run build

FROM node:18-alpine AS release

WORKDIR /app

# Copy only what's needed from the builder stage
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json

ENV NODE_ENV=production

# Install production dependencies only
RUN npm install --omit=dev

ENTRYPOINT ["node", "/app/dist/index.js"]