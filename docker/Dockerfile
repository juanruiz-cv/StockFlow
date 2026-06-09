# Stage 1: Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production --ignore-scripts

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./
COPY nx.json ./
COPY apps/api ./apps/api
COPY libs/shared ./libs/shared

RUN npm ci
RUN npx nx build api --skip-nx-cache

# Stage 3: Production
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist/apps/api ./dist
COPY --from=builder /app/package.json ./

USER nestjs

EXPOSE 3000

CMD ["node", "dist/main.js"]
